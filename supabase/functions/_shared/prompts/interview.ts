export function buildInterviewPrompt(resume: any, job: any | null): string {
  const d = resume?.data ?? resume;

  const experienceText = (d.experience ?? [])
    .map((e: any) =>
      `${e.title} at ${e.company} (${e.start ?? ""}–${e.end ?? ""}): ${(e.responsibilities ?? []).join("; ")}`
    )
    .join("\n");

  const jobContext = job
    ? `Target job: ${job.job_title ?? ""} at ${job.company_name ?? ""}
Requirements: ${[...(job.primary_skills?.value ?? []), ...(job.secondary_skills?.value ?? [])].join(", ")}
Responsibilities: ${(job.key_responsibilities?.value ?? []).join("; ")}`
    : "No specific job provided — generate general interview questions based on the candidate's profile.";

  return `Generate 10 interview questions for this candidate.
- 5 behavioral questions (STAR method framework)
- 5 technical questions specific to their skills and the role

Candidate summary:
Name: ${d.name ?? ""}
Skills: ${(d.skills ?? []).join(", ")}
Experience:
${experienceText}

${jobContext}

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "type": "behavioral",
    "question": "Tell me about a time when...",
    "hints": ["Focus on X", "Mention Y"],
    "focus_area": "leadership"
  },
  {
    "type": "technical",
    "question": "How would you...",
    "hints": ["Consider X", "Think about Y"],
    "focus_area": "React performance"
  }
]`;
}
