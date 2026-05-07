import { corsHeaders } from "../_shared/cors.ts";
import { generateWithRetry, generateEmbedding } from "../_shared/gemini.ts";
import { createUserClient, supabaseAdmin, ensureProfile } from "../_shared/supabase-admin.ts";

const MATCH_PROMPT = (resume: object, job: object) =>
  `Score how well this candidate matches this job posting.

Resume data:
${JSON.stringify(resume, null, 2)}

Job posting data:
${JSON.stringify(job, null, 2)}

Return ONLY a JSON object (no markdown):
{
  "score": <0-100 overall match>,
  "breakdown": {
    "technical_skills": <0-100>,
    "experience": <0-100>,
    "domain_match": <0-100>,
    "role_level": <0-100>
  },
  "analysis": "<2-3 sentence explanation highlighting strengths and gaps>"
}`;

const JOB_PARSE_PROMPT = (url: string) =>
  `Extract information from this job posting URL: ${url}

Return ONLY a JSON object (no markdown):
{
  "job_title": "<title>",
  "company_name": "<company>",
  "job_description": { "value": "<summary>", "type": "string" },
  "primary_skills": { "value": ["..."], "type": "string[]" },
  "secondary_skills": { "value": ["..."], "type": "string[]" },
  "years_experience": { "value": <number or null>, "type": "number" },
  "key_responsibilities": { "value": ["..."], "type": "string[]" },
  "key_qualifications": { "value": ["..."], "type": "string[]" }
}`;

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
console.log("Chunked resume data:", chunks);
  return chunks;
}

function chunkJob(parsed: any): { text: string; metadata: object }[] {
  const chunks: { text: string; metadata: object }[] = [];

  if (parsed.job_description?.value) {
    chunks.push({ text: parsed.job_description.value, metadata: { section: "description" } });
  }

  const skills = [
    ...(parsed.primary_skills?.value ?? []),
    ...(parsed.secondary_skills?.value ?? []),
  ].filter(Boolean);
  if (skills.length) {
    chunks.push({ text: skills.join(", "), metadata: { section: "skills" } });
  }

  if (parsed.key_responsibilities?.value?.length) {
    chunks.push({ text: parsed.key_responsibilities.value.join(" "), metadata: { section: "responsibilities" } });
  }

  if (parsed.key_qualifications?.value?.length) {
    chunks.push({ text: parsed.key_qualifications.value.join(" "), metadata: { section: "qualifications" } });
  }

  console.log("Chunked job data:", chunks);

  return chunks;
}

async function upsertEmbeddings(
  sourceType: "resume" | "job",
  sourceId: string,
  chunks: { text: string; metadata: object }[]
): Promise<void> {
  console.log(`Upserting ${chunks.length} embeddings for ${sourceType} ${sourceId}`);
  
  await supabaseAdmin
    .from("embeddings")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  const rows = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log("Sample chunk:", chunks[i]);
    const values = await generateEmbedding(chunks[i].text);
    rows.push({
      source_type: sourceType,
      source_id: sourceId,
      chunk_index: i,
      chunk_text: chunks[i].text,
      embedding: `[${values.join(",")}]`,
      metadata: chunks[i].metadata,
    });
  }

  if (rows.length) {
    await supabaseAdmin.from("embeddings").insert(rows);
  }
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

    const { resumeId, jobUrl } = await req.json();
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

    // // 2. Check job cache by URL
    // let jobId: string;
    // let jobParsedData: any;
    // let jobIsNew = false;

    // const { data: existingJob } = await supabaseAdmin
    //   .from("jobs")
    //   .select("id, parsed_data")
    //   .eq("source_url", jobUrl)
    //   .maybeSingle();

    // if (existingJob) {
    //   jobId = existingJob.id;
    //   jobParsedData = existingJob.parsed_data;
    // } else {
    //   const raw = await generateWithRetry([{ text: JOB_PARSE_PROMPT(jobUrl) }]);
    //   jobParsedData = JSON.parse(raw.replace(/```json|```/g, "").trim());
    //   console.log("Parsed job data:", jobParsedData);
    //   jobId = crypto.randomUUID();
    //   const { error: jobInsertError } = await supabaseAdmin.from("jobs").insert({
    //     id: jobId,
    //     source_url: jobUrl,
    //     parsed_data: jobParsedData,
    //     job_title: jobParsedData.job_title ?? null,
    //     company_name: jobParsedData.company_name ?? null,
    //   });

    //   if (jobInsertError) {
    //     // Race condition: another request inserted same URL — fetch it
    //     if (jobInsertError.code === "23505") {
    //       const { data: raceJob } = await supabaseAdmin
    //         .from("jobs")
    //         .select("id, parsed_data")
    //         .eq("source_url", jobUrl)
    //         .single();
    //       jobId = raceJob!.id;
    //       jobParsedData = raceJob!.parsed_data;
    //     } else {
    //       throw new Error(`Job insert failed: ${jobInsertError.message}`);
    //     }
    //   } else {
    //     jobIsNew = true;
    //   }
    // }

    // // 3. Embed job chunks if new
    // if (jobIsNew) {
    //   await upsertEmbeddings("job", jobId, chunkJob(jobParsedData));
    // }

    // 4. Embed resume chunks if not already done
    const { count: resumeEmbedCount } = await supabaseAdmin
      .from("embeddings")
      .select("id", { count: "exact", head: true })
      .eq("source_type", "resume")
      .eq("source_id", resumeId);

    if (!resumeEmbedCount) {
      await upsertEmbeddings("resume", resumeId, chunkResume(resumeRow.parsed_data));
    }

    // 5. Score with Gemini
    const raw = await generateWithRetry([
      { text: MATCH_PROMPT(resumeRow.parsed_data, jobParsedData) },
    ]);
    const matchResult = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // 6. Upsert into user_jobs
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
