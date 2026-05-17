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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!envReady) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    setTimeout(() => {
      void refresh();
    }, 0);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
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
