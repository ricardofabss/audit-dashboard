"use client";

import type { PermissionCode } from "@/types/auth";
import { usePermission } from "@/hooks/use-permission";

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionCode;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const canAccess = usePermission(permission);
  return canAccess ? <>{children}</> : <>{fallback}</>;
}
