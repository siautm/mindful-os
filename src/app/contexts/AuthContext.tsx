import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

const SESSION_STARTED_AT_KEY = "mindful_session_started_at";
/** Default 1 min for testing. Set VITE_SESSION_TTL_MS (ms), min 10000. */
const SESSION_TTL_MS =
  typeof import.meta.env.VITE_SESSION_TTL_MS === "string" &&
  import.meta.env.VITE_SESSION_TTL_MS.trim() !== "" &&
  Number.isFinite(Number(import.meta.env.VITE_SESSION_TTL_MS))
    ? Math.max(10_000, Number(import.meta.env.VITE_SESSION_TTL_MS))
    : 60 * 1000;

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
      if (data.session) {
        let t0 = getSessionStartedAt();
        if (!t0) {
          t0 = Date.now();
          setSessionStartedAt(t0);
        }
        setStartedAt(t0);
        if (isExpired(Date.now(), t0)) {
          void supabase.auth.signOut();
          setSession(null);
          setLoading(false);
          return;
        }
      }
      setSession(data.session ?? null);
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

  useEffect(() => {
    if (!session?.user || startedAt == null) return;
    const logoutAt = startedAt + SESSION_TTL_MS;
    const schedule = (): ReturnType<typeof setTimeout> | undefined => {
      const delay = logoutAt - Date.now();
      if (delay <= 0) {
        void supabase.auth.signOut();
        return undefined;
      }
      return window.setTimeout(() => void supabase.auth.signOut(), delay);
    };
    let timer = schedule();
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() >= logoutAt) {
        void supabase.auth.signOut();
        return;
      }
      if (timer !== undefined) clearTimeout(timer);
      timer = schedule();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [session?.user?.id, startedAt]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
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
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
