import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { supabase, streamEdgeFunction } from "../lib/supabase";
import { EDGE_FN } from "../lib/constants";

interface JobOption {
  job_id: string;
  jobs: { id: string; job_title: string; company_name: string } | null;
}

function MarkdownText({ text }: { text: string }) {
  // Simple markdown: headers, bold, bullet lists — no external dep needed
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-bold text-gray-800 mt-5 mb-1 first:mt-0">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="text-base font-semibold text-gray-700 mt-3 mb-0.5">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1");
          return (
            <p key={i} className="text-sm text-gray-700 pl-4 flex gap-2">
              <span className="text-gray-400 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
            </p>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        return (
          <p
            key={i}
            className="text-sm text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
          />
        );
      })}
    </div>
  );
}

export default function CareerPage() {
  const { resumeId } = useParams({ strict: false }) as { resumeId: string };
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [content, setContent] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("user_jobs")
      .select("job_id, jobs(id, job_title, company_name)")
      .eq("resume_id", resumeId)
      .order("saved_at", { ascending: false })
      .then(({ data }) => {
        if (data) setJobOptions(data as unknown as JobOption[]);
      });
  }, [resumeId]);

  // Auto-scroll while streaming
  useEffect(() => {
    if (streaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [content, streaming]);

  async function generate() {
    setStreaming(true);
    setDone(false);
    setError(null);
    setContent("");
    try {
      const body: Record<string, string> = { resumeId };
      if (selectedJobId) body.jobId = selectedJobId;
      await streamEdgeFunction(EDGE_FN.CAREER_PLAN, body, (chunk) => {
        setContent((prev) => prev + chunk);
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? "Generation failed.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/resume/$resumeId"
          params={{ resumeId }}
          className="text-blue-500 text-sm hover:underline"
        >
          ← Resume
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Career Plan</h1>
      </div>

      <div className="flex gap-3">
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">General career plan</option>
          {jobOptions.map((o) => (
            <option key={o.job_id} value={o.job_id}>
              {o.jobs?.job_title ?? "Role"} — {o.jobs?.company_name}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={streaming}
          className="bg-blue-600 text-white px-5 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {streaming ? "Generating…" : content ? "Regenerate" : "Generate"}
        </button>
      </div>

      {streaming && !content && (
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Writing your career plan…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {content && (
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
          <MarkdownText text={content} />
          {streaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse rounded-sm" />
          )}
          {done && (
            <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
              Plan saved to your account.
            </p>
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
