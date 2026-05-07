-- Enable pgvector for embeddings (Phase 4)
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles: mirrors auth.users, extended with display info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Resumes table
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Jobs: canonical job postings, deduplicated by URL
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT UNIQUE NOT NULL,
  parsed_data JSONB NOT NULL,
  job_title TEXT,
  company_name TEXT,
  parsed_at TIMESTAMPTZ DEFAULT NOW()
);

-- User job history: resume <-> job with match score
CREATE TABLE public.user_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  match_score SMALLINT CHECK (match_score BETWEEN 0 AND 100),
  match_breakdown JSONB,
  match_analysis TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resume_id, job_id)
);

-- Embeddings for RAG (Phase 4-5)
CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('resume', 'job')),
  source_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview sessions (Phase 5)
CREATE TABLE public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  session_type TEXT DEFAULT 'mixed',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career plans (Phase 5)
CREATE TABLE public.career_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  gap_analysis JSONB,
  study_plan JSONB,
  salary_strategy TEXT,
  target_title TEXT,
  target_salary_min INTEGER,
  target_salary_max INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX idx_user_jobs_user_id ON public.user_jobs(user_id);
CREATE INDEX idx_user_jobs_resume_id ON public.user_jobs(resume_id);
CREATE INDEX idx_embeddings_source ON public.embeddings(source_type, source_id);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users manage own resumes" ON public.resumes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users read jobs" ON public.jobs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users manage own job history" ON public.user_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own embeddings" ON public.embeddings FOR ALL USING (
  (source_type = 'resume' AND source_id IN (SELECT id FROM public.resumes WHERE user_id = auth.uid()))
);
CREATE POLICY "Users manage own interview sessions" ON public.interview_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own career plans" ON public.career_plans FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resume-pdfs', 'resume-pdfs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users access own resume files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'resume-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]
  );
