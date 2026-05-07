import { createClient, FunctionsHttpError } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export { supabaseUrl, supabaseAnonKey };

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class RateLimitError extends Error {
  requiresAuth = true as const;
  resetAt: string;
  constructor(message: string, resetAt: string) {
    super(message);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
  }
}

export async function streamEdgeFunction(
  name: string,
  body: object,
  onChunk: (text: string) => void
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session?.access_token ?? supabaseAnonKey}`,
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error ?? `${name} failed`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) onChunk(parsed.text);
      } catch (e) {
        if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e;
      }
    }
  }
}

export async function callEdgeFunction(name: string, body: object): Promise<any> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.requiresAuth) throw new RateLimitError(body.message, body.resetAt);
        if (body?.error) throw new Error(body.error);
      } catch (inner) {
        if (inner instanceof RateLimitError) throw inner;
      }
    }
    throw new Error(`${name}: ${error.message}`);
  }

  return data;
}
