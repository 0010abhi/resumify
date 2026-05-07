import { supabaseAdmin } from "./supabase-admin.ts";

const MAX_REQUESTS = 3;
const WINDOW_MINUTES = 60;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  identifier: string,
  action: string
): Promise<RateLimitResult> {
  const windowMs = WINDOW_MINUTES * 60 * 1000;
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - windowMs);

  const { data: existing } = await supabaseAdmin
    .from("rate_limits")
    .select("request_count, window_start")
    .eq("identifier", identifier)
    .eq("action", action)
    .single();

  // No record yet — first request
  if (!existing) {
    await supabaseAdmin.from("rate_limits").insert({
      identifier,
      action,
      request_count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: new Date(now.getTime() + windowMs) };
  }

  const windowStart = new Date(existing.window_start);

  // Window expired — reset
  if (windowStart < windowCutoff) {
    await supabaseAdmin
      .from("rate_limits")
      .update({ request_count: 1, window_start: now.toISOString() })
      .eq("identifier", identifier)
      .eq("action", action);
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: new Date(now.getTime() + windowMs) };
  }

  // Within window — check limit
  if (existing.request_count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(windowStart.getTime() + windowMs),
    };
  }

  // Increment
  await supabaseAdmin
    .from("rate_limits")
    .update({ request_count: existing.request_count + 1 })
    .eq("identifier", identifier)
    .eq("action", action);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - existing.request_count - 1,
    resetAt: new Date(windowStart.getTime() + windowMs),
  };
}
