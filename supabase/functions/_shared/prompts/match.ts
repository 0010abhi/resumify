interface RetrievedChunk {
  chunk_text: string;
  section: string;
  similarity: number;
}

export function buildMatchPrompt(resume: object, job: object): string {
  return `Score how well this candidate matches this job posting.

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
}

export function buildRagMatchPrompt(chunks: RetrievedChunk[], job: object): string {
  return `You are scoring a candidate against a job posting using retrieved resume evidence.

Job requirements:
${JSON.stringify(job, null, 2)}

Retrieved resume evidence (most relevant sections, ranked by semantic similarity to the job):
${chunks.map((c) => `[${c.section}] "${c.chunk_text}" (similarity: ${c.similarity.toFixed(2)})`).join("\n")}

Score ONLY based on the evidence provided above. Return ONLY a JSON object (no markdown):
{
  "score": <0-100 overall match>,
  "breakdown": {
    "technical_skills": <0-100>,
    "experience": <0-100>,
    "domain_match": <0-100>,
    "role_level": <0-100>
  },
  "analysis": "<2-3 sentence explanation highlighting strengths and gaps based on the retrieved evidence>"
}`;
}
