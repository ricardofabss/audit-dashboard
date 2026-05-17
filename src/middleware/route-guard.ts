import { protectedRoutePermissions } from "@/lib/auth/config";
import type { PermissionCode } from "@/types/auth";

export function requiredPermissionForPath(pathname: string): PermissionCode | null {
  for (const [route, permission] of Object.entries(protectedRoutePermissions)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return permission;
  }
  return null;
}
