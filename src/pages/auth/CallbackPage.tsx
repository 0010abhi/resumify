import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase, callEdgeFunction } from "../../lib/supabase";
import { EDGE_FN } from "../../lib/constants";

export default function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback(session: any) {
      if (!session) {
        navigate({ to: "/auth/login" });
        return;
      }

      const pending = sessionStorage.getItem("pendingResume");
      if (pending) {
        sessionStorage.removeItem("pendingResume");
        try {
          const { tempId, pdfBase64, fileName } = JSON.parse(pending);
          let resumeId: string;
          if (tempId) {
            // Fast path: resume already stored server-side, just claim it
            const result = await callEdgeFunction(EDGE_FN.CLAIM_RESUME, { tempId });
            resumeId = result.resume_id;
          } else {
            // Fallback: storage failed during parse, upload now
            const result = await callEdgeFunction(EDGE_FN.UPLOAD_RESUME, { pdfBase64, fileName });
            resumeId = result.resume_id;
          }
          navigate({ to: "/resume/$resumeId", params: { resumeId } });
          return;
        } catch (err) {
          console.error("Failed to save pending resume:", err);
        }
      }

      navigate({ to: "/dashboard" });
    }

    // Listen for auth state — magic link sets session via URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") handleCallback(session);
    });

    // Also check if session already exists (page reload case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleCallback(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center flex-grow gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      <p className="text-gray-500">Signing you in...</p>
    </div>
  );
}
