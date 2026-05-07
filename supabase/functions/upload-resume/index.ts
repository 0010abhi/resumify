import { corsHeaders } from "../_shared/cors.ts";
import { generateWithRetry } from "../_shared/gemini.ts";
import { supabaseAdmin, createUserClient, ensureProfile } from "../_shared/supabase-admin.ts";
import { STORAGE_BUCKET } from "../_shared/constants.ts";
import { PARSE_RESUME_PROMPT } from "../_shared/prompts/resume.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user JWT
    const userClient = createUserClient(authHeader);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await ensureProfile(user.id, user.email ?? "");

    const { pdfBase64, fileName = "resume.pdf" } = await req.json();
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "pdfBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse PDF with Gemini (with retry for 503 / high demand)
    const raw = await generateWithRetry([
      { text: PARSE_RESUME_PROMPT },
      { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
    ]);
    const parsedData = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // Upload PDF to Supabase Storage
    const resumeId = crypto.randomUUID();
    const storagePath = `${user.id}/${resumeId}.pdf`;
    const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));

    const { error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdfBytes, { contentType: "application/pdf" });

    if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`);

    // Save to resumes table
    const { error: dbError } = await supabaseAdmin.from("resumes").insert({
      id: resumeId,
      user_id: user.id,
      name: fileName,
      storage_path: storagePath,
      parsed_data: parsedData,
    });

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

    return new Response(
      JSON.stringify({ resume_id: resumeId, parsed_data: parsedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("upload-resume error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
