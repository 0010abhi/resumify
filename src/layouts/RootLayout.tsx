import { Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="flex flex-col min-h-screen w-screen">
      <header className="flex items-center justify-between p-4 bg-blue-400 text-white">
        <Link to="/" className="text-3xl font-mono font-bold">RESUMIFY</Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {user ? (
            <>
              <Link to="/dashboard" className="hover:underline">Dashboard</Link>
              <Link to="/upload" className="hover:underline">Upload</Link>
              <button onClick={handleSignOut} className="hover:underline">Sign Out</button>
            </>
          ) : (
            <Link to="/auth/login" className="hover:underline">Sign In</Link>
          )}
        </nav>
      </header>
      <main className="flex flex-col flex-grow">
        <Outlet />
      </main>
      <footer className="text-center p-4 mt-4 bg-gray-200 text-gray-700 print:hidden">
        &copy; 2026 Resumify. All rights reserved.
      </footer>
    </div>
  );
}
