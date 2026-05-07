import { useState, useEffect } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { supabase, callEdgeFunction } from "../lib/supabase";

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

export default function MatchPage() {
  const { resumeId } = useParams({ strict: false }) as { resumeId: string };
  const [jobUrl, setJobUrl] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleMatch() {
    if (!jobUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await callEdgeFunction("match-job", {
        resumeId,
        jobUrl: jobUrl.trim(),
      });
      setResult(data);
      loadHistory();
    } catch (err: any) {
      setError(err.message ?? "Match failed. Please try again.");
    } finally {
      setLoading(false);
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
          onKeyDown={(e) => e.key === "Enter" && handleMatch()}
          placeholder="Paste a LinkedIn or other job posting URL"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleMatch}
          disabled={loading || !jobUrl.trim()}
          className="bg-blue-600 text-white px-5 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? "Analyzing…" : "Match"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Parsing job and scoring… this takes ~15 seconds
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="border border-gray-200 rounded-xl p-6 flex flex-col gap-5 shadow-sm">
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

          <div className="flex flex-col gap-3">
            <ScoreBar label="Technical Skills" value={result.match_breakdown.technical_skills} />
            <ScoreBar label="Experience" value={result.match_breakdown.experience} />
            <ScoreBar label="Domain Match" value={result.match_breakdown.domain_match} />
            <ScoreBar label="Role Level" value={result.match_breakdown.role_level} />
          </div>

          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 leading-relaxed">
            {result.match_analysis}
          </p>
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
