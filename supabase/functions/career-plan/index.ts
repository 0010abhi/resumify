import { corsHeaders } from "../_shared/cors.ts";
import { ai, GEMINI_MODEL } from "../_shared/gemini.ts";
import { createUserClient, supabaseAdmin, ensureProfile } from "../_shared/supabase-admin.ts";

function buildPrompt(resume: any, job: any | null): string {
  const d = resume?.data ?? resume;

  const expSummary = (d.experience ?? [])
    .map((e: any) => `- ${e.title} at ${e.company} (${e.start ?? ""}–${e.end ?? ""})`)
    .join("\n");

  const jobSection = job
    ? `## Target Role
Title: ${job.job_title ?? ""}
Company: ${job.company_name ?? ""}
Required skills: ${[...(job.primary_skills?.value ?? []), ...(job.secondary_skills?.value ?? [])].join(", ")}
Experience required: ${job.years_experience?.value ?? "not specified"} years
Key responsibilities: ${(job.key_responsibilities?.value ?? []).join("; ")}`
    : "No specific target role — provide general career advancement advice based on current profile.";

  return `You are a senior career coach. Produce a comprehensive, actionable career plan.

## Candidate Profile
Name: ${d.name ?? ""}
Skills: ${(d.skills ?? []).join(", ")}
Experience:
${expSummary}
Summary: ${d.professionalSummary ?? ""}

${jobSection}

Write the career plan in markdown using these exact sections:

## Gap Analysis
Identify what is strong and what is missing for the target role. Be specific — name exact skills, years of experience, or domain knowledge gaps. Estimate weeks to close each gap.

## 30 / 60 / 90 Day Study Plan
Week-by-week breakdown. Include specific courses, books, projects, or open-source contributions. Each milestone should be measurable.

## Salary Strategy
Realistic market salary range for this role and experience level. When to negotiate, how to anchor, and what leverage this candidate specifically has. Include scripts for key moments.

## Interview Positioning
3–5 key stories to prepare from their experience (reference actual companies/roles). How to frame any gaps. Common objections for this profile and how to handle them.`;
}

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

    const prompt = buildPrompt(resumeRow.parsed_data, jobData);

    // Stream response back as SSE
    let fullText = "";
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await ai.models.generateContentStream({
            model: GEMINI_MODEL,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          });

          for await (const chunk of result.stream) {
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) {
              fullText += text;
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }

          // Persist after full generation
          await supabaseAdmin.from("career_plans").insert({
            user_id: user.id,
            resume_id: resumeId,
            job_id: jobId ?? null,
            salary_strategy: fullText,
            target_title: jobData?.job_title ?? null,
          });

          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("career-plan error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
