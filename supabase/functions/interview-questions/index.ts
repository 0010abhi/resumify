import { corsHeaders } from "../_shared/cors.ts";
import { ai, GEMINI_MODEL } from "../_shared/gemini.ts";
import { createUserClient, supabaseAdmin, ensureProfile } from "../_shared/supabase-admin.ts";
import { THINKING_BUDGET } from "../_shared/constants.ts";
import { buildInterviewPrompt } from "../_shared/prompts/interview.ts";

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

    const { resumeId, jobId } = await req.json();
    if (!resumeId) {
      return new Response(JSON.stringify({ error: "resumeId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch resume (verify ownership)
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

    // Optionally fetch job
    let jobData = null;
    if (jobId) {
      const { data: jobRow } = await supabaseAdmin
        .from("jobs")
        .select("parsed_data, job_title, company_name")
        .eq("id", jobId)
        .maybeSingle();
      if (jobRow) {
        jobData = { ...jobRow.parsed_data, job_title: jobRow.job_title, company_name: jobRow.company_name };
      }
    }

    const prompt = buildInterviewPrompt(resumeRow.parsed_data, jobData);

    // Use Gemini with thinking for higher quality questions
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: THINKING_BUDGET } },
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const questions = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // Persist session
    const { data: session } = await supabaseAdmin
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        resume_id: resumeId,
        job_id: jobId ?? null,
        questions,
        session_type: jobId ? "targeted" : "general",
      })
      .select("id")
      .single();

    return new Response(
      JSON.stringify({ session_id: session?.id, questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("interview-questions error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
