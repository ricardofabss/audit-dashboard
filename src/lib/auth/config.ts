import type { PermissionCode } from "@/types/auth";

export const publicRoutes = ["/login", "/403", "/unauthorized"];

export const protectedRoutePermissions: Record<string, PermissionCode> = {
  "/dashboard": "dashboard.read",
  "/audit": "audit.read",
  "/findings": "findings.read",
  "/wbs": "wbs.read",
  "/investigation": "investigation.read",
  "/risk": "risk.read",
  "/compliance": "compliance.read",
  "/users": "users.manage",
  "/settings": "settings.manage",
};
