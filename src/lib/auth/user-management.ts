import { hasPermission, hasRole } from "@/lib/auth/permissions";
import type { SessionIdentity } from "@/types/auth";

export function canManageUsers(identity: SessionIdentity | null) {
  if (!identity) return false;
  return (
    hasRole(identity.roles, "OWNER") ||
    hasRole(identity.roles, "ADMIN") ||
    hasPermission(identity.permissions, "users.manage")
  );
}
