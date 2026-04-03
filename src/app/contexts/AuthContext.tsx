import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

const SESSION_STARTED_AT_KEY = "mindful_session_started_at";
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

function getSessionStartedAt(): number | null {
  const raw = localStorage.getItem(SESSION_STARTED_AT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function setSessionStartedAt(ts: number | null): void {
  if (!ts) {
    localStorage.removeItem(SESSION_STARTED_AT_KEY);
    return;
  }
  localStorage.setItem(SESSION_STARTED_AT_KEY, String(ts));
}

function isExpired(now: number, startedAt: number | null): boolean {
  if (!startedAt) return true;
  return now - startedAt >= SESSION_TTL_MS;
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [startedAt, setStartedAt] = useState<number | null>(() => getSessionStartedAt());

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      // If a session exists but we don't have a start timestamp yet, start now.
      if (data.session && !getSessionStartedAt()) {
        const now = Date.now();
        setSessionStartedAt(now);
        setStartedAt(now);
      }
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      if (nextSession) {
        const now = Date.now();
        setSessionStartedAt(now);
        setStartedAt(now);
      } else {
        setSessionStartedAt(null);
        setStartedAt(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      isSessionExpired: isExpired(Date.now(), startedAt),
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, startedAt]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

