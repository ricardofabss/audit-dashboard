"use client";

import type { PermissionCode, AppRole } from "@/types/auth";
import { hasPermission, hasRole } from "@/lib/auth/permissions";
import { useAuth } from "@/hooks/use-auth";

export function usePermission(permission: PermissionCode) {
  const { identity } = useAuth();
  return hasPermission(identity?.permissions ?? [], permission);
}

export function useRole(role: AppRole) {
  const { identity } = useAuth();
  return hasRole(identity?.roles ?? [], role);
}
