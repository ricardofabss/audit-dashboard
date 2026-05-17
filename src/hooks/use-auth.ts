"use client";

import { useAuthContext } from "@/modules/auth/auth-context";

export function useAuth() {
  return useAuthContext();
}
