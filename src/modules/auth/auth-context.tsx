"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { identity: SessionIdentity | null };
    return payload.identity;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const currentIdentity = await loadIdentity();
      setIdentity(currentIdentity);
    } catch {
      setIdentity(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await signOutService();
    setIdentity(null);
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
    [loading, identity, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used inside AuthProvider");
  return context;
}
