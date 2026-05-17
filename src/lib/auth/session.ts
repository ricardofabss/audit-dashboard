import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { getIdentityFromDatabase } from "@/lib/auth/identity-db";
import { parseMetadataPermissions, parseMetadataRoles } from "@/lib/auth/identity-sync";
import type { SessionIdentity } from "@/types/auth";

async function getIdentityFromSupabaseApi(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  authUserId: string,
  email: string | null,
  metadata: { roles?: unknown; permissions?: unknown; branchId?: unknown; divisionId?: unknown },
): Promise<SessionIdentity> {
  const metadataRoles = parseMetadataRoles(metadata.roles);
  const metadataPermissions = parseMetadataPermissions(metadata.permissions);

  const identity: SessionIdentity = {
    userId: authUserId,
    email,
    profileId: null,
    roles: metadataRoles,
    permissions: metadataPermissions,
    branchId: typeof metadata.branchId === "string" ? metadata.branchId : null,
    divisionId: typeof metadata.divisionId === "string" ? metadata.divisionId : null,
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,branch_id,division_id,status")
    .eq("auth_user_id", authUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!profile?.id) return identity;

  identity.profileId = profile.id;
  identity.branchId = typeof profile.branch_id === "string" ? profile.branch_id : identity.branchId;
  identity.divisionId =
    typeof profile.division_id === "string" ? profile.division_id : identity.divisionId;

  if (identity.roles.length === 0) {
    const { data: profileRoles } = await supabase
      .from("profile_roles")
      .select("role:roles(code)")
      .eq("profile_id", profile.id)
      .is("deleted_at", null);

    const roles = (profileRoles ?? [])
      .map((item) => {
        const roleValue = item.role as { code?: unknown } | Array<{ code?: unknown }> | null;
        if (Array.isArray(roleValue)) return roleValue[0]?.code;
        return roleValue?.code;
      })
      .filter((code): code is string => typeof code === "string" && code.length > 0);

    identity.roles = parseMetadataRoles([...new Set(roles)]);
  }

  if (identity.permissions.length === 0 && identity.roles.length > 0) {
    const { data: roleIdsRows } = await supabase
      .from("roles")
      .select("id")
      .in("code", identity.roles)
      .is("deleted_at", null);

    const roleIds = (roleIdsRows ?? [])
      .map((row) => row.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (roleIds.length > 0) {
      const { data: permissionRows } = await supabase
        .from("role_permissions")
        .select("permission:permissions(code)")
        .in("role_id", roleIds)
        .is("deleted_at", null);

      const permissions = (permissionRows ?? [])
        .map((item) => {
          const permissionValue = item.permission as
            | { code?: unknown }
            | Array<{ code?: unknown }>
            | null;
          if (Array.isArray(permissionValue)) return permissionValue[0]?.code;
          return permissionValue?.code;
        })
        .filter((code): code is string => typeof code === "string" && code.length > 0);

      identity.permissions = parseMetadataPermissions([...new Set(permissions)]);
    }
  }

  return identity;
}

export async function getServerSessionIdentity(): Promise<SessionIdentity | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    return await getIdentityFromDatabase(user.id, user.email ?? null);
  } catch {
    return getIdentityFromSupabaseApi(supabase, user.id, user.email ?? null, {
      roles: user.app_metadata?.roles,
      permissions: user.app_metadata?.permissions,
      branchId: user.app_metadata?.branchId,
      divisionId: user.app_metadata?.divisionId,
    });
  }
}
