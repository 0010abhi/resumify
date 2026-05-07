import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient, supabaseAdmin, ensureProfile } from "../_shared/supabase-admin.ts";
import { STORAGE_BUCKET } from "../_shared/constants.ts";

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

    const { tempId } = await req.json();
    if (!tempId) {
      return new Response(JSON.stringify({ error: "tempId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the temp record — must be unexpired and unclaimed
    const { data: tempRecord, error: fetchError } = await supabaseAdmin
      .from("temp_resumes")
      .select("*")
      .eq("id", tempId)
      .gt("expires_at", new Date().toISOString())
      .is("claimed_by", null)
      .single();

    if (fetchError || !tempRecord) {
      return new Response(JSON.stringify({ error: "Temp resume not found or already claimed" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Move file from temp/{tempId}.pdf → {userId}/{resumeId}.pdf
    const resumeId = crypto.randomUUID();
    const destPath = `${user.id}/${resumeId}.pdf`;

    const { error: moveError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .move(tempRecord.storage_path, destPath);

    if (moveError) {
      console.error("Storage move failed:", moveError.message);
      return new Response(JSON.stringify({ error: "Failed to move file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into resumes table
    const { error: insertError } = await supabaseAdmin.from("resumes").insert({
      id: resumeId,
      user_id: user.id,
      name: tempRecord.file_name,
      storage_path: destPath,
      parsed_data: tempRecord.parsed_data,
    });

    if (insertError) {
      console.error("resumes insert failed:", insertError.message);
      // Move file back to avoid orphan
      await supabaseAdmin.storage.from(STORAGE_BUCKET).move(destPath, tempRecord.storage_path);
      return new Response(JSON.stringify({ error: "Failed to save resume" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark the temp record as claimed
    await supabaseAdmin.from("temp_resumes").update({
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
    }).eq("id", tempId);

    return new Response(JSON.stringify({ resume_id: resumeId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("claim-resume error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
