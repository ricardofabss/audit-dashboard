import type { AppRole, PermissionCode } from "@/types/auth";

export function hasRole(roles: AppRole[], role: AppRole) {
  return roles.includes(role);
}

export function hasPermission(permissions: string[], permission: PermissionCode) {
  return permissions.includes(permission);
}

export function hasScopeAccess(
  userScope: { branchId: string | null; divisionId: string | null },
  targetScope: { branchId?: string | null; divisionId?: string | null },
) {
  if (targetScope.branchId && userScope.branchId && userScope.branchId !== targetScope.branchId) return false;
  if (targetScope.divisionId && userScope.divisionId && userScope.divisionId !== targetScope.divisionId) return false;
  return true;
}
