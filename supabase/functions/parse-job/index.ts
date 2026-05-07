import { corsHeaders } from "../_shared/cors.ts";
import { generateWithRetry } from "../_shared/gemini.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are given a job posting URL: ${url}.
Your task is to extract and summarize the following information from the job posting.
Return the result as a JSON object with these fields (include a top-level {error: true, message: "..."} if extraction fails):

job_description (string): A concise summary of the job description.
primary_skills (string[]): The main skills required for the job.
secondary_skills (string[]): Additional or nice-to-have skills.
years_experience (number): Minimum years of experience required.
key_responsibilities (string[]): List of main responsibilities.
key_qualifications (string[]): List of required qualifications.

For each field, also include a "type" property describing the data type.
If any field is missing or ambiguous, set its value to null and add a note in an "extraction_notes" field.
Example output:
{
  "job_description": { "value": "...", "type": "string" },
  "primary_skills": { "value": ["..."], "type": "string[]" },
  ...
  "extraction_notes": "..."
}`;

    const raw = await generateWithRetry([{ text: prompt }]);
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-job error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
