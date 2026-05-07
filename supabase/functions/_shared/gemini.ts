import { GoogleGenAI } from "npm:@google/genai@^1.34.0";

const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
if (!apiKey) throw new Error("GOOGLE_AI_API_KEY environment variable is required");

export const ai = new GoogleGenAI({ apiKey });
export const GEMINI_MODEL = "gemini-2.5-flash";
// outputDimensionality truncates to 768 to stay compatible with the existing vector(768) schema.
const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIM = 768;

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIM },
  });
  return response.embeddings?.[0]?.values ?? [];
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
