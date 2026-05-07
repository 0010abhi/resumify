import { createClient } from "npm:@supabase/supabase-js@^2";

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

export function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
}

// Call before any insert that references profiles.id.
// No-ops if the profile already exists; creates it if the trigger missed (e.g. pre-migration user).
export async function ensureProfile(userId: string, email: string): Promise<void> {
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, email }, { onConflict: "id", ignoreDuplicates: true });
}
