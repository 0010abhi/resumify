import { GoogleGenAI } from "@google/genai";
import { useState, useEffect } from "react";
import geminiPrompts from "../prompts/gemini-prompts";
import { callEdgeFunction, RateLimitError } from "../lib/supabase";

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";

const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const ai = USE_BACKEND ? null : new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY! });

export interface RateLimitState {
  message: string;
  resetAt: string;
}

export default function useLinkedInParser(data: any, type = "parseResume") {
  const [parseResume, setParseResume] = useState<any>(null);
  const [tempId, setTempId] = useState<string | null>(null);
  const [strategy, setStrategy] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);

  async function generateParsedData() {
    if (data == null) return;
    setRateLimit(null);

    if (USE_BACKEND) {
      try {
        const result = await callEdgeFunction("parse-resume", { pdfBase64: data });
        const { tempId: tid, ...parsed } = result;
        if (tid) setTempId(tid);
        setParseResume(parsed);
      } catch (err) {
        if (err instanceof RateLimitError) {
          setRateLimit({ message: err.message, resetAt: err.resetAt });
        } else {
          console.error("parse-resume error:", err);
        }
      }
      return;
    }

    const contents = [
      { text: geminiPrompts[type]?.text },
      { inlineData: { mimeType: "application/pdf", data } },
    ];
    const response: any = await ai!.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });
    setParseResume(
      JSON.parse(
        response?.candidates[0]?.content?.parts[0]?.text
          .replace(/```json|```/g, "")
          .trim()
      )
    );
  }

  const generateStrategy = async () => {
    setStrategy("");
    setIsLoading(true);
    const contents = [{ text: geminiPrompts[type] }];
    try {
      const result: any = await ai!.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents,
      });
      for await (const chunk of result.stream) {
        setStrategy((prev: any) => prev + chunk.text());
      }
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (data && type === "parseResume") generateParsedData();
    if (data && type === "suggestStrategy") generateStrategy();
  }, [data, type]);

  return { strategy, parseResume, tempId, isLoading, rateLimit };
}
