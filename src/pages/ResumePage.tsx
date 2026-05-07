import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import ChooseTemplate from "../components/ChooseTemplate";

export default function ResumePage() {
  const { resumeId } = useParams({ strict: false }) as { resumeId: string };
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("resumes")
      .select("parsed_data, name")
      .eq("id", resumeId)
      .single()
      .then(({ data, error }) => {
        if (error) setError("Resume not found.");
        else setResumeData(data?.parsed_data);
        setLoading(false);
      });
  }, [resumeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-grow">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow gap-4">
        <p className="text-red-500">{error}</p>
        <Link to="/dashboard" className="text-blue-500 underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow">
      <div className="flex items-center gap-4 px-6 pt-4 print:hidden">
        <Link to="/dashboard" className="text-blue-500 text-sm hover:underline">
          ← Dashboard
        </Link>
        <div className="ml-auto flex gap-2">
          <Link
            to="/resume/$resumeId/match"
            params={{ resumeId }}
            className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700"
          >
            Match Job
          </Link>
          <Link
            to="/resume/$resumeId/interview"
            params={{ resumeId }}
            className="bg-purple-600 text-white text-sm px-4 py-1.5 rounded hover:bg-purple-700"
          >
            Interview
          </Link>
          <Link
            to="/resume/$resumeId/career"
            params={{ resumeId }}
            className="bg-green-600 text-white text-sm px-4 py-1.5 rounded hover:bg-green-700"
          >
            Career Plan
          </Link>
        </div>
      </div>
      <ChooseTemplate data={resumeData} />
    </div>
  );
}
