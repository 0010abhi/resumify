import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("0010abhi@gmail.com");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow gap-4 p-8">
        <div className="text-5xl">📬</div>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-gray-500">Magic link sent to <strong>{email}</strong></p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow gap-6 p-8">
      <h1 className="text-2xl font-bold text-indigo-600">Sign in to Resumify</h1>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Magic Link"}
        </button>
      </div>
    </div>
  );
}
