# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite HMR)
npm run build      # Type-check + build to dist/
npm run preview    # Serve the dist/ build locally
npm run lint       # ESLint
npm run test       # Run tests with Vitest (watch mode)
```

`npm run build` opens `bundle-report.html` automatically (rollup-plugin-visualizer).

## Environment

Copy `.env.local.example` to `.env.local`:
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<sb_publishable_...key>
VITE_USE_BACKEND=true
# VITE_GOOGLE_AI_API_KEY=...   # only needed when VITE_USE_BACKEND=false
```

The `sb_publishable_...` key format requires `supabase.functions.invoke()` — raw Bearer token fetch does **not** work with it. All Edge Function calls go through `callEdgeFunction()` / `streamEdgeFunction()` in `src/lib/supabase.ts`.

## Architecture

Resumify is a React SPA (React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Router, Redux Toolkit) backed by Supabase (Auth, PostgreSQL + pgvector, Storage, Edge Functions).

### Core upload/parse flow
1. User uploads a LinkedIn PDF on the homepage (`/`)
2. `ParseLinkedInResume` converts it to base64 via `src/utitlity/fileToGenerativePart.ts`
3. `useLinkedInParser` hook calls the `parse-resume` Edge Function, which calls Gemini 2.5 Flash and returns `ResumeData` JSON + a `tempId`
4. `ChooseTemplate` renders the parsed JSON as `TemplateOne` or `TemplateTwo`; PDF export via `window.print()`
5. Unauthenticated users get 3 free parses/hour per IP (rate-limited at the Edge Function). The parsed PDF is stored server-side under `resume-pdfs/temp/{tempId}.pdf` so it can be claimed after login without re-uploading

### Post-login resume claiming
- After a successful parse, `App.tsx` stores `{ tempId, fileName }` in `sessionStorage.pendingResume`
- When the user logs in, `CallbackPage` reads this and calls `claim-resume` (moves file from `temp/` → `{userId}/`, inserts into `resumes` table)
- Fallback: if `tempId` is absent (storage failed), `pdfBase64` is stored instead and `upload-resume` is called

### Routing (`src/router.tsx`)
TanStack Router, code-based. Protected routes use a `beforeLoad: requireAuth` guard that calls `supabase.auth.getSession()`.

| Path | Component | Auth |
|---|---|---|
| `/` | `App` (homepage + parse flow) | No |
| `/auth/login` | `LoginPage` | No |
| `/auth/callback` | `CallbackPage` | No |
| `/dashboard` | `DashboardPage` | Yes |
| `/upload` | `UploadPage` | Yes |
| `/resume/$resumeId` | `ResumePage` | Yes |
| `/resume/$resumeId/match` | `MatchPage` | Yes |
| `/resume/$resumeId/interview` | `InterviewPage` | Yes |
| `/resume/$resumeId/career` | `CareerPage` | Yes |

### State management
- `authSlice` (`src/features/auth/authSlice.ts`) — Redux, holds session + user. `useAuth` hook initialises it via `onAuthStateChange`.
- Parsed resume data flows through `useState` / props, not Redux.
- `resumeSlice.ts` in `src/components/` is leftover counter boilerplate — unused.

## Edge Functions (`supabase/functions/`)

Deploy: `npx supabase functions deploy <name> --project-ref <ref>`

Add-on secrets required in Supabase dashboard → Edge Functions → Secrets: `GOOGLE_AI_API_KEY`.

| Function | JWT required | Purpose |
|---|---|---|
| `parse-resume` | No (rate-limited by IP for anon) | Parse PDF with Gemini, store to `temp_resumes`, return `{ ...parsedData, tempId }` |
| `parse-job` | No | Parse job posting URL with Gemini |
| `upload-resume` | Yes | Parse + upload PDF to `{userId}/{resumeId}.pdf`, insert into `resumes` |
| `claim-resume` | Yes | Move `temp/{tempId}.pdf` → `{userId}/{resumeId}.pdf`, insert into `resumes` |
| `match-job` | Yes | Parse job URL, embed chunks, score resume vs job with Gemini (0–100 + breakdown), store in `user_jobs` |
| `interview-questions` | Yes | Generate 10 tailored questions (5 behavioral, 5 technical) with Gemini thinking mode, store in `interview_sessions` |
| `career-plan` | Yes | Stream a full career plan (gap analysis, study plan, salary strategy) as SSE, store in `career_plans` |

### Shared utilities (`supabase/functions/_shared/`)
- `cors.ts` — CORS headers
- `gemini.ts` — `ai` client, `generateWithRetry()` (exponential backoff for 503/429), `generateEmbedding()` (text-embedding-004, 768-dim)
- `supabase-admin.ts` — `supabaseAdmin` (service role) + `createUserClient(authHeader)` for JWT validation
- `rate-limit.ts` — `checkRateLimit(identifier, action)` — 3 requests/hour per IP using `rate_limits` table

## Frontend utilities (`src/lib/supabase.ts`)

- `supabase` — singleton Supabase client
- `callEdgeFunction(name, body)` — wraps `supabase.functions.invoke()`, throws `RateLimitError` on 429
- `streamEdgeFunction(name, body, onChunk)` — SSE streaming via `fetch` with auth header; parses `data: {...}` lines
- `RateLimitError` — has `message` and `resetAt` fields; caught in `useLinkedinParser` to show the rate-limit banner in `App.tsx`

## Database schema

Migrations in `supabase/migrations/` — run manually via Supabase Dashboard → SQL Editor.

| Table | Purpose |
|---|---|
| `profiles` | Mirrors `auth.users`; auto-created via trigger on signup |
| `resumes` | Saved resumes: `user_id`, `storage_path`, `parsed_data` (JSONB), `is_active` |
| `temp_resumes` | Short-lived (24h) pre-auth uploads: `storage_path`, `parsed_data`, `claimed_by`, `claimed_at` |
| `jobs` | Canonical job postings deduplicated by `source_url`; `parsed_data` (JSONB) |
| `user_jobs` | Resume ↔ job match: `match_score` (0–100), `match_breakdown` (JSONB), `match_analysis` |
| `embeddings` | pgvector chunks for resumes and jobs: `source_type`, `source_id`, `embedding vector(768)` |
| `interview_sessions` | Generated question sets: `questions` (JSONB array) |
| `career_plans` | Streamed career plan output: `salary_strategy` (full markdown text) |
| `rate_limits` | IP-based rate limiting: `identifier`, `action`, `request_count`, `window_start` |

pgvector RPCs (defined in migration 3): `match_resume_chunks`, `match_embeddings` — used for similarity search.

All tables have RLS enabled. `temp_resumes` and `rate_limits` are service-role only (no RLS policies needed).

## Key type shape

Resume JSON returned by Gemini:
```ts
{
  data: {
    name, email, phone, skills: string[],
    links: { type, url }[],
    professionalSummary: string,
    experience: { title, company, duration, start, end, responsibilities: string[] }[],
    education: { degree, school, duration, start, end, description }[],
    achievements: string[]
  }
}
```
`TemplateOne` accesses `data?.data` — one level of nesting that is easy to miss. `match-job` and `interview-questions` Edge Functions handle both `parsed?.data` and `parsed` directly.
