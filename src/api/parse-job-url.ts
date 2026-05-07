import { GoogleGenAI } from "@google/genai";
import * as Sentry from "@sentry/react";
import { callEdgeFunction } from "../lib/supabase";
import { GEMINI_MODEL, EDGE_FN } from "../lib/constants";

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";

// Only used when VITE_USE_BACKEND is false (local dev without Supabase)
const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const ai = USE_BACKEND || !GOOGLE_AI_API_KEY ? null : new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });

export default async function ParseJobUrl(
    link = "https://careers.bitfinex.com/o/mobile-developer-react-native-100-remote-worldwide-11"
) {
    Sentry.logger.info("job url link: " + link, {
        action: "parse_job_url",
        timestamp: new Date().toISOString(),
    });

    if (USE_BACKEND) {
        return callEdgeFunction(EDGE_FN.PARSE_JOB, { url: link });
    }

    const prompt = `You are given a LinkedIn job posting URL: ${link}.
Your task is to extract and summarize the following information from the job posting.
Return the result as a JSON object with these fields (include a top-level {error: true, message: "..."} if extraction fails or is limited):

job_description (string): A concise summary of the job description.
primary_skills (string[]): The main skills required for the job.
secondary_skills (string[]): Additional or nice-to-have skills.
years_experience (number): Minimum years of experience required.
key_responsibilities (string[]): List of main responsibilities.
key_qualifications (string[]): List of required qualifications.

For each field, also include a "type" property describing the data type (e.g., "string", "string[]", "number").
If any field is missing or ambiguous, set its value to null and add a note in an "extraction_notes" field.
Example output:
{
"job_description": { "value": "...", "type": "string" },
"primary_skills": { "value": ["..."], "type": "string[]" },
...
"extraction_notes": "..."
}`;

    const response: any = await ai!.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ text: prompt }],
    });

    const jsonData =
        response?.candidates[0]?.content?.parts[0]?.text
            .replace(/```json|```/g, "")
            .trim();
    return JSON.parse(jsonData);
}
