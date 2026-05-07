import { createRouter, createRootRoute, createRoute, redirect } from "@tanstack/react-router";
import { supabase } from "./lib/supabase";
import RootLayout from "./layouts/RootLayout";
import LoginPage from "./pages/auth/LoginPage";
import CallbackPage from "./pages/auth/CallbackPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import ResumePage from "./pages/ResumePage";
import MatchPage from "./pages/MatchPage";
import InterviewPage from "./pages/InterviewPage";
import CareerPage from "./pages/CareerPage";

// Current App content stays at "/" for unauthenticated access
import App from "./App";

async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw redirect({ to: "/auth/login" });
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/login",
  component: LoginPage,
});

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  component: CallbackPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: requireAuth,
  component: DashboardPage,
});

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  beforeLoad: requireAuth,
  component: UploadPage,
});

const resumeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/resume/$resumeId",
  beforeLoad: requireAuth,
  component: ResumePage,
});

const matchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/resume/$resumeId/match",
  beforeLoad: requireAuth,
  component: MatchPage,
});

const interviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/resume/$resumeId/interview",
  beforeLoad: requireAuth,
  component: InterviewPage,
});

const careerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/resume/$resumeId/career",
  beforeLoad: requireAuth,
  component: CareerPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  callbackRoute,
  dashboardRoute,
  uploadRoute,
  resumeRoute,
  matchRoute,
  interviewRoute,
  careerRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
