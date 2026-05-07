CREATE TABLE public.rate_limits (
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identifier, action)
);

-- Only accessed by service role via Edge Functions — no RLS needed
