import { useState, useEffect } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { supabase, callEdgeFunction } from "../lib/supabase";
import { EDGE_FN } from "../lib/constants";

interface RetrievedChunk {
  chunk_text: string;
  section: string;
  similarity: number;
}

interface MatchResult {
  match_score: number;
  match_breakdown: {
    technical_skills: number;
    experience: number;
    domain_match: number;
    role_level: number;
  };
  match_analysis: string;
  job: { id: string; title: string; company: string; url: string };
  mode: "gemini" | "rag";
  retrieved_chunks?: RetrievedChunk[];
}

interface HistoryRow {
  id: string;
  match_score: number;
  match_analysis: string;
  saved_at: string;
  jobs: { source_url: string; job_title: string; company_name: string } | null;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75 ? "bg-green-500" : value >= 50 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function scoreColor(score: number) {
  return score >= 75 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-500";
}

const SECTION_COLORS: Record<string, string> = {
  skills: "bg-blue-100 text-blue-700",
  experience: "bg-purple-100 text-purple-700",
  identity: "bg-gray-100 text-gray-700",
  education: "bg-yellow-100 text-yellow-700",
  achievements: "bg-green-100 text-green-700",
  unknown: "bg-gray-100 text-gray-500",
};

function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-indigo-400 h-1.5 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function MatchPage() {
  const { resumeId } = useParams({ strict: false }) as { resumeId: string };
  const [jobUrl, setJobUrl] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"gemini" | "rag" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChunks, setShowChunks] = useState(false);

  function loadHistory() {
    supabase
      .from("user_jobs")
      .select("id, match_score, match_analysis, saved_at, jobs(source_url, job_title, company_name)")
      .eq("resume_id", resumeId)
      .order("saved_at", { ascending: false })
      .then(({ data }) => {
        if (data) setHistory(data as unknown as HistoryRow[]);
      });
  }

  useEffect(() => {
    loadHistory();
  }, [resumeId]);

  async function handleMatch(mode: "gemini" | "rag") {
    if (!jobUrl.trim()) return;
    setLoading(true);
    setLoadingMode(mode);
    setError(null);
    setResult(null);
    setShowChunks(false);
    try {
      const data = await callEdgeFunction(EDGE_FN.MATCH_JOB, {
        resumeId,
        jobUrl: jobUrl.trim(),
        mode,
      });
      setResult(data);
      loadHistory();
    } catch (err: any) {
      setError(err.message ?? "Match failed. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMode(null);
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
        <h1 className="text-2xl font-bold text-gray-800">Job Match</h1>
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleMatch("gemini")}
          placeholder="Paste a LinkedIn or other job posting URL"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleMatch("gemini")}
          disabled={loading || !jobUrl.trim()}
          className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading && loadingMode === "gemini" ? "Analyzing…" : "Match without RAG"}
        </button>
        <button
          onClick={() => handleMatch("rag")}
          disabled={loading || !jobUrl.trim()}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading && loadingMode === "rag" ? "Retrieving & Analyzing…" : "Match with RAG"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
          {loadingMode === "rag"
            ? "Embedding resume chunks, retrieving relevant evidence, scoring… ~20s"
            : "Parsing job and scoring… ~15s"}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="border border-gray-200 rounded-xl p-6 flex flex-col gap-5 shadow-sm">
          {/* Mode badge */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                result.mode === "rag"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {result.mode === "rag" ? "RAG" : "Gemini only"}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-4">
            <span className={`text-5xl font-bold ${scoreColor(result.match_score)}`}>
              {result.match_score}%
            </span>
            <div>
              <p className="font-semibold text-gray-800">
                {result.job.title ?? "Position"}
              </p>
              <p className="text-sm text-gray-500">{result.job.company}</p>
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="flex flex-col gap-3">
            <ScoreBar label="Technical Skills" value={result.match_breakdown.technical_skills} />
            <ScoreBar label="Experience" value={result.match_breakdown.experience} />
            <ScoreBar label="Domain Match" value={result.match_breakdown.domain_match} />
            <ScoreBar label="Role Level" value={result.match_breakdown.role_level} />
          </div>

          {/* Analysis */}
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 leading-relaxed">
            {result.match_analysis}
          </p>

          {/* Retrieved evidence (RAG only) */}
          {result.retrieved_chunks && result.retrieved_chunks.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowChunks((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                <span>{showChunks ? "▾" : "▸"}</span>
                Retrieved Evidence ({result.retrieved_chunks.length} chunks)
              </button>

              {showChunks && (
                <div className="mt-3 flex flex-col gap-3">
                  {result.retrieved_chunks.map((chunk, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            SECTION_COLORS[chunk.section] ?? SECTION_COLORS.unknown
                          }`}
                        >
                          {chunk.section}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{chunk.chunk_text}</p>
                      <SimilarityBar value={chunk.similarity} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Match History</h2>
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="border border-gray-100 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-sm text-gray-800">
                    {item.jobs?.job_title ?? "Unknown role"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.jobs?.company_name} ·{" "}
                    {new Date(item.saved_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-2xl font-bold ${scoreColor(item.match_score)}`}>
                  {item.match_score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
