import { NextResponse, type NextRequest } from "next/server";
import { publicRoutes } from "@/lib/auth/config";
import { createSupabaseMiddlewareClient } from "@/lib/auth/supabase-middleware";
import { requiredPermissionForPath } from "@/middleware/route-guard";
import { hasSupabasePublicEnv } from "@/lib/auth/env";
import { parseMetadataPermissions, parseMetadataRoles } from "@/lib/auth/identity-sync";

async function getFallbackClaims(supabase: ReturnType<typeof createSupabaseMiddlewareClient>["supabase"], authUserId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,status")
    .eq("auth_user_id", authUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileError || !profile?.id) {
    return { roles: [] as string[], permissions: [] as string[], status: null as string | null };
  }

  const { data: roleRows } = await supabase
    .from("profile_roles")
    .select("role:roles(code)")
    .eq("profile_id", profile.id)
    .is("deleted_at", null);

  const roles = (roleRows ?? [])
    .map((row) => {
      const roleValue = row.role as { code?: unknown } | Array<{ code?: unknown }> | null;
      if (Array.isArray(roleValue)) return roleValue[0]?.code;
      return roleValue?.code;
    })
    .filter((code): code is string => typeof code === "string" && code.length > 0);

  if (roles.length === 0) {
    return { roles, permissions: [] as string[], status: profile.status ?? null };
  }

  const { data: roleIdsRows } = await supabase
    .from("roles")
    .select("id")
    .in("code", roles)
    .is("deleted_at", null);

  const roleIds = (roleIdsRows ?? []).map((row) => row.id).filter((id): id is string => Boolean(id));
  if (roleIds.length === 0) {
    return { roles: [...new Set(roles)], permissions: [] as string[], status: profile.status ?? null };
  }

  const { data: permissionRows } = await supabase
    .from("role_permissions")
    .select("permission:permissions(code)")
    .in("role_id", roleIds)
    .is("deleted_at", null);

  const permissions = [...new Set(
    (permissionRows ?? [])
      .map((row) => {
        const permissionValue = row.permission as
          | { code?: unknown }
          | Array<{ code?: unknown }>
          | null;
        if (Array.isArray(permissionValue)) return permissionValue[0]?.code;
        return permissionValue?.code;
      })
      .filter((code): code is string => typeof code === "string" && code.length > 0),
  )];

  return { roles: [...new Set(roles)], permissions, status: profile.status ?? null };
}

async function getProfileStatus(
  supabase: ReturnType<typeof createSupabaseMiddlewareClient>["supabase"],
  authUserId: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("auth_user_id", authUserId)
    .is("deleted_at", null)
    .maybeSingle();
  return typeof profile?.status === "string" ? profile.status : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // FORCE BYPASS for prototype
  if (true) return NextResponse.next();

  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const permission = requiredPermissionForPath(pathname);
  if (!permission) return response;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const profileStatus = await getProfileStatus(supabase, user!.id);
  if (profileStatus === "SUSPENDED" || profileStatus === "DISABLED") {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  let permissions = parseMetadataPermissions(user?.app_metadata?.permissions);
  let roles = parseMetadataRoles(user?.app_metadata?.roles);
  if (roles.length === 0 && permissions.length === 0) {
    const fallbackClaims = await getFallbackClaims(supabase, user!.id);
    if (fallbackClaims.status === "SUSPENDED" || fallbackClaims.status === "DISABLED") {
      return NextResponse.redirect(new URL("/403", request.url));
    }
    roles = parseMetadataRoles(fallbackClaims.roles);
    permissions = parseMetadataPermissions(fallbackClaims.permissions);
  }

  const bypass = roles.includes("OWNER") || roles.includes("ADMIN");
  if (!bypass && !permissions.includes(permission!)) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/audit/:path*",
    "/findings/:path*",
    "/wbs/:path*",
    "/investigation/:path*",
    "/risk/:path*",
    "/compliance/:path*",
    "/planning/:path*",
    "/execution/:path*",
    "/follow-up/:path*",
    "/documents/:path*",
    "/approvals/:path*",
    "/notifications/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/ai/:path*",
  ],
};
