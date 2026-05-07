import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";

interface Resume {
  id: string;
  name: string;
  created_at: string;
  parsed_data: { data?: { name?: string; email?: string } };
}

export default function DashboardPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("resumes")
      .select("id, name, created_at, parsed_data")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setResumes((data as Resume[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col p-6 gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Resumes</h1>
        <Link to="/upload" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Upload New
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : resumes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No resumes yet.</p>
          <Link to="/upload" className="text-blue-500 underline mt-2 inline-block">
            Upload your first resume
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume) => (
            <Link
              key={resume.id}
              to="/resume/$resumeId"
              params={{ resumeId: resume.id }}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
            >
              <h2 className="font-semibold text-lg">
                {resume.parsed_data?.data?.name ?? resume.name}
              </h2>
              <p className="text-gray-500 text-sm">{resume.parsed_data?.data?.email}</p>
              <p className="text-gray-400 text-xs mt-2">
                {new Date(resume.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
