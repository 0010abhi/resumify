import { corsHeaders } from "../_shared/cors.ts";
import { generateWithRetry, generateEmbedding } from "../_shared/gemini.ts";
import { createUserClient, supabaseAdmin, ensureProfile } from "../_shared/supabase-admin.ts";
import { RAG_CHUNKS_PER_QUERY, RAG_TOP_CHUNKS } from "../_shared/constants.ts";
import { buildMatchPrompt, buildRagMatchPrompt } from "../_shared/prompts/match.ts";
import { buildJobParsePrompt } from "../_shared/prompts/job.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RetrievedChunk {
  chunk_text: string;
  chunk_index: number;
  metadata: { section?: string; [key: string]: unknown };
  similarity: number;
  section: string;
}

// ─── Resume chunking ──────────────────────────────────────────────────────────

function chunkResume(parsed: any): { text: string; metadata: object }[] {
  const d = parsed?.data ?? parsed;
  const chunks: { text: string; metadata: object }[] = [];

  const identity = [d.name, d.professionalSummary].filter(Boolean).join(". ");
  if (identity) chunks.push({ text: identity, metadata: { section: "identity" } });

  if (d.skills?.length) {
    chunks.push({ text: d.skills.join(", "), metadata: { section: "skills" } });
  }

  for (const exp of d.experience ?? []) {
    const resp = Array.isArray(exp.responsibilities) ? exp.responsibilities.join(" ") : "";
    const text = `${exp.title} at ${exp.company} (${exp.start ?? ""}–${exp.end ?? ""}): ${resp}`.trim();
    chunks.push({ text, metadata: { section: "experience", company: exp.company, title: exp.title } });
  }

  if (d.education?.length) {
    const text = d.education.map((e: any) => `${e.degree} at ${e.school}`).join(". ");
    chunks.push({ text, metadata: { section: "education" } });
  }

  const achievements = (d.achievements ?? []).filter(Boolean);
  if (achievements.length) {
    chunks.push({ text: achievements.join(" "), metadata: { section: "achievements" } });
  }

  return chunks;
}

// ─── RAG helpers ──────────────────────────────────────────────────────────────

async function upsertResumeEmbeddings(resumeId: string, parsed: any): Promise<void> {
  const { count } = await supabaseAdmin
    .from("embeddings")
    .select("id", { count: "exact", head: true })
    .eq("source_type", "resume")
    .eq("source_id", resumeId);

  if (count && count > 0) return;

  await supabaseAdmin
    .from("embeddings")
    .delete()
    .eq("source_type", "resume")
    .eq("source_id", resumeId);

  const chunks = chunkResume(parsed);
  const rows = [];
  for (let i = 0; i < chunks.length; i++) {
    const values = await generateEmbedding(chunks[i].text);
    rows.push({
      source_type: "resume",
      source_id: resumeId,
      chunk_index: i,
      chunk_text: chunks[i].text,
      embedding: `[${values.join(",")}]`,
      metadata: chunks[i].metadata,
    });
  }
  if (rows.length) await supabaseAdmin.from("embeddings").insert(rows);
}

async function retrieveRelevantChunks(resumeId: string, jobParsed: any): Promise<RetrievedChunk[]> {
  // Build one query text per job aspect to cover different dimensions of the role
  const queries = [
    jobParsed.job_description?.value,
    (jobParsed.primary_skills?.value ?? []).join(", "),
    (jobParsed.key_responsibilities?.value ?? []).join(" "),
    (jobParsed.key_qualifications?.value ?? []).join(" "),
  ].filter(Boolean);

  // Deduplicate by chunk_index, keeping the highest similarity seen across all queries
  const chunkMap = new Map<number, RetrievedChunk>();

  for (const queryText of queries) {
    const queryEmbedding = await generateEmbedding(queryText);
    const { data: chunks } = await supabaseAdmin.rpc("match_embeddings", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      source_type_filter: "resume",
      source_id_filter: resumeId,
      match_count: RAG_CHUNKS_PER_QUERY,
    });

    for (const chunk of chunks ?? []) {
      const existing = chunkMap.get(chunk.chunk_index);
      if (!existing || existing.similarity < chunk.similarity) {
        chunkMap.set(chunk.chunk_index, {
          ...chunk,
          section: chunk.metadata?.section ?? "unknown",
        });
      }
    }
  }

  return Array.from(chunkMap.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, RAG_TOP_CHUNKS);
}

// ─── Job cache ────────────────────────────────────────────────────────────────

async function fetchOrParseJob(jobUrl: string): Promise<{ jobId: string; jobParsedData: any }> {
  const { data: existingJob } = await supabaseAdmin
    .from("jobs")
    .select("id, parsed_data")
    .eq("source_url", jobUrl)
    .maybeSingle();

  if (existingJob) {
    return { jobId: existingJob.id, jobParsedData: existingJob.parsed_data };
  }

  const raw = await generateWithRetry([{ text: buildJobParsePrompt(jobUrl) }]);
  const jobParsedData = JSON.parse(raw.replace(/```json|```/g, "").trim());
  const jobId = crypto.randomUUID();

  const { error: insertError } = await supabaseAdmin.from("jobs").insert({
    id: jobId,
    source_url: jobUrl,
    parsed_data: jobParsedData,
    job_title: jobParsedData.job_title ?? null,
    company_name: jobParsedData.company_name ?? null,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raceJob } = await supabaseAdmin
        .from("jobs")
        .select("id, parsed_data")
        .eq("source_url", jobUrl)
        .single();
      return { jobId: raceJob!.id, jobParsedData: raceJob!.parsed_data };
    }
    throw new Error(`Job insert failed: ${insertError.message}`);
  }

  return { jobId, jobParsedData };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createUserClient(authHeader);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await ensureProfile(user.id, user.email ?? "");

    const { resumeId, jobUrl, mode = "gemini" } = await req.json();
    if (!resumeId || !jobUrl) {
      return new Response(JSON.stringify({ error: "resumeId and jobUrl are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch resume (verify ownership)
    const { data: resumeRow, error: resumeError } = await supabaseAdmin
      .from("resumes")
      .select("parsed_data")
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .single();

    if (resumeError || !resumeRow) {
      return new Response(JSON.stringify({ error: "Resume not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse / fetch cached job
    const { jobId, jobParsedData } = await fetchOrParseJob(jobUrl);

    // 3. Score — two paths depending on mode
    let matchResult: any;
    let retrievedChunks: RetrievedChunk[] | undefined;

    if (mode === "rag") {
      // RAG: embed resume → retrieve relevant chunks → Gemini scores on focused context
      await upsertResumeEmbeddings(resumeId, resumeRow.parsed_data);
      retrievedChunks = await retrieveRelevantChunks(resumeId, jobParsedData);
      const raw = await generateWithRetry([{ text: buildRagMatchPrompt(retrievedChunks, jobParsedData) }]);
      matchResult = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } else {
      // Gemini-only: pass full resume + job JSON directly
      const raw = await generateWithRetry([{ text: buildMatchPrompt(resumeRow.parsed_data, jobParsedData) }]);
      matchResult = JSON.parse(raw.replace(/```json|```/g, "").trim());
    }

    // 4. Upsert into user_jobs
    await supabaseAdmin.from("user_jobs").upsert(
      {
        user_id: user.id,
        resume_id: resumeId,
        job_id: jobId,
        match_score: matchResult.score,
        match_breakdown: matchResult.breakdown,
        match_analysis: matchResult.analysis,
        saved_at: new Date().toISOString(),
      },
      { onConflict: "user_id,resume_id,job_id" }
    );

    return new Response(
      JSON.stringify({
        match_score: matchResult.score,
        match_breakdown: matchResult.breakdown,
        match_analysis: matchResult.analysis,
        job: {
          id: jobId,
          title: jobParsedData.job_title,
          company: jobParsedData.company_name,
          url: jobUrl,
        },
        mode,
        ...(retrievedChunks && {
          retrieved_chunks: retrievedChunks.map((c) => ({
            chunk_text: c.chunk_text,
            section: c.section,
            similarity: c.similarity,
          })),
        }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("match-job error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
