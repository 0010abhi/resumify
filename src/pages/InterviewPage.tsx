import { useState, useEffect } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { supabase, callEdgeFunction } from "../lib/supabase";
import { EDGE_FN } from "../lib/constants";

interface Question {
  type: "behavioral" | "technical";
  question: string;
  hints: string[];
  focus_area: string;
}

interface JobOption {
  job_id: string;
  jobs: { id: string; job_title: string; company_name: string } | null;
}

function QuestionCard({ q, index }: { q: Question; index: number }) {
  const [open, setOpen] = useState(false);
  const isBehavioral = q.type === "behavioral";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50"
      >
        <span className={`mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isBehavioral
            ? "bg-purple-100 text-purple-700"
            : "bg-blue-100 text-blue-700"
        }`}>
          {isBehavioral ? "Behavioral" : "Technical"}
        </span>
        <span className="flex-1 text-sm text-gray-800 font-medium leading-snug">
          Q{index + 1}. {q.question}
        </span>
        <span className="shrink-0 text-gray-400 text-xs mt-0.5">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 mt-3 mb-2 uppercase tracking-wide font-semibold">
            Hints
          </p>
          <ul className="flex flex-col gap-1">
            {q.hints.map((h, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="text-gray-400">•</span> {h}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-3">Focus: {q.focus_area}</p>
        </div>
      )}
    </div>
  );
}

export default function InterviewPage() {
  const { resumeId } = useParams({ strict: false }) as { resumeId: string };
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function generate() {
    setLoading(true);
    setError(null);
    setQuestions([]);
    try {
      const body: Record<string, string> = { resumeId };
      if (selectedJobId) body.jobId = selectedJobId;
      const data = await callEdgeFunction(EDGE_FN.INTERVIEW_QUESTIONS, body);
      setQuestions(data.questions ?? []);
    } catch (err: any) {
      setError(err.message ?? "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  const behavioral = questions.filter((q) => q.type === "behavioral");
  const technical = questions.filter((q) => q.type === "technical");

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
        <h1 className="text-2xl font-bold text-gray-800">Mock Interview</h1>
      </div>

      <div className="flex gap-3">
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">General (no specific job)</option>
          {jobOptions.map((o) => (
            <option key={o.job_id} value={o.job_id}>
              {o.jobs?.job_title ?? "Role"} — {o.jobs?.company_name}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? "Generating…" : questions.length ? "Regenerate" : "Generate"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Generating tailored questions… ~15 seconds
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {questions.length > 0 && (
        <>
          {behavioral.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">
                Behavioral ({behavioral.length})
              </h2>
              <div className="flex flex-col gap-2">
                {behavioral.map((q, i) => (
                  <QuestionCard key={i} q={q} index={i} />
                ))}
              </div>
            </div>
          )}

          {technical.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">
                Technical ({technical.length})
              </h2>
              <div className="flex flex-col gap-2">
                {technical.map((q, i) => (
                  <QuestionCard key={i} q={q} index={behavioral.length + i} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
