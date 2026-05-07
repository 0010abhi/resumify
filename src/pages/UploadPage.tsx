import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import fileToGenerativePart from "../utitlity/fileToGenerativePart";
import { callEdgeFunction } from "../lib/supabase";
import { useToast } from "../context/ToastContext";

export default function UploadPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { inlineData } = await fileToGenerativePart(file);
      const result = await callEdgeFunction("upload-resume", {
        pdfBase64: inlineData.data,
        fileName: file.name,
      });
      showToast("Resume uploaded and parsed!", "success");
      navigate({ to: "/resume/$resumeId", params: { resumeId: result.resume_id } });
    } catch (err) {
      console.error(err);
      showToast("Upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow gap-6 p-8">
      <h1 className="text-2xl font-bold text-indigo-600">Upload Your Resume</h1>
      <div className="border-dashed border-2 rounded-2xl border-slate-300 text-center p-12 w-full max-w-md">
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-gray-500">Uploading and parsing your resume...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-400 mb-4">Select your LinkedIn PDF export</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
          </>
        )}
      </div>
    </div>
  );
}
