export function buildJobParsePrompt(url: string): string {
  return `Extract information from this job posting URL: ${url}

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
}
