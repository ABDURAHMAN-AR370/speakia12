import { useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole, getUserProfile, type UserRole, type UserProfile } from "@/lib/auth";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    profile: null,
    loading: true,
    isAdmin: false,
  });

  const fetchUserData = useCallback(async (userId: string) => {
    const [role, profile] = await Promise.all([
      getUserRole(userId),
      getUserProfile(userId),
    ]);
    
    return { role, profile };
  }, []);

  useEffect(() => {
    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to prevent potential race conditions
          setTimeout(async () => {
            const { role, profile } = await fetchUserData(session.user.id);
            setAuthState({
              user: session.user,
              session,
              role,
              profile,
              loading: false,
              isAdmin: role === "admin",
            });
          }, 0);
        } else {
          setAuthState({
            user: null,
            session: null,
            role: null,
            profile: null,
            loading: false,
            isAdmin: false,
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { role, profile } = await fetchUserData(session.user.id);
        setAuthState({
          user: session.user,
          session,
          role,
          profile,
          loading: false,
          isAdmin: role === "admin",
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  return authState;
}
