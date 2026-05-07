CREATE TABLE public.temp_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,          -- resume-pdfs/temp/{id}.pdf
  file_name TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ
);

-- Only accessed by service role via Edge Functions
-- No RLS needed — never exposed directly to clients
