import { GoogleGenAI } from "npm:@google/genai@^1.34.0";

const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
if (!apiKey) throw new Error("GOOGLE_AI_API_KEY environment variable is required");

export const ai = new GoogleGenAI({ apiKey });
export const GEMINI_MODEL = "gemini-2.5-flash";
export const EMBEDDING_MODEL = "text-embedding-004";

// Direct REST call — the @google/genai SDK uses v1beta by default, but
// text-embedding-004 embedContent is only available on the v1 stable endpoint.
export async function generateEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: `models/${EMBEDDING_MODEL}`, content: { parts: [{ text }] } }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.embedding?.values ?? [];
}

export async function generateWithRetry(
  contents: object[],
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
      });
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return text;
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err?.message?.includes("503") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("429") ||
        err?.message?.includes("RESOURCE_EXHAUSTED");

      if (!isRetryable) throw err;

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Gemini attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error("Gemini request failed after retries");
}
