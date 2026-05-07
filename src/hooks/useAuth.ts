import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { setSession, selectUser, selectAuthStatus } from "../features/auth/authSlice";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setSession({ session, user: session?.user ?? null }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setSession({ session, user: session?.user ?? null }));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return { user, status };
}
