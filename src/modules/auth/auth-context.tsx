"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";
import { hasSupabasePublicEnv } from "@/lib/auth/env";
import { signOut as signOutService } from "@/services/auth/auth-service";
import type { SessionIdentity } from "@/types/auth";

type AuthContextValue = {
  loading: boolean;
  authenticated: boolean;
  identity: SessionIdentity | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadIdentity(): Promise<SessionIdentity | null> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as { identity: SessionIdentity | null };
  return payload.identity;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const envReady = hasSupabasePublicEnv();
  const [loading, setLoading] = useState(envReady);
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setIdentity(await loadIdentity());
    } catch {
      // If token refresh fails (stale/expired session), clear identity gracefully
      setIdentity(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // In development mode or if Supabase is unconfigured, skip Supabase browser client entirely
    // to avoid _refreshAccessToken errors. Just load the dev bypass identity from the API.
    const isDev = process.env.NODE_ENV === "development" || !envReady;
    if (isDev) {
      void refresh();
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setTimeout(() => {
      void refresh();
    }, 0);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIdentity(null);
        setLoading(false);
        return;
      }
      void refresh();
    });

    // Handle Supabase internal errors (e.g. stale refresh tokens in localStorage)
    supabase.auth.getSession().catch(() => {
      setIdentity(null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [envReady]);

  const signOut = useCallback(async () => {
    await signOutService();
    await refresh();
    window.location.href = "/login";
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      authenticated: Boolean(identity?.userId),
      identity,
      refresh,
      signOut,
    }),
    [loading, identity, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used inside AuthProvider");
  return context;
}
