export function buildCareerPrompt(resume: any, job: any | null): string {
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
