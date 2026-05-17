import type { AppRole, PermissionCode, SessionIdentity } from "@/types/auth";
import { getIdentityFromDatabase } from "@/lib/auth/identity-db";
import { createSupabaseAdminClient } from "@/lib/auth/supabase-admin";

type UserMetadata = {
  roles?: string[];
  permissions?: string[];
  branchId?: string | null;
  divisionId?: string | null;
};

function normalize(values: string[] | undefined) {
  return [...new Set(values ?? [])].sort();
}

function isEqualArray(a: string[] | undefined, b: string[] | undefined) {
  const left = normalize(a);
  const right = normalize(b);
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function toMetadata(identity: SessionIdentity): UserMetadata {
  return {
    roles: identity.roles,
    permissions: identity.permissions,
    branchId: identity.branchId,
    divisionId: identity.divisionId,
  };
}

export async function syncIdentityToSupabaseMetadata(params: {
  authUserId: string;
  email: string | null;
  currentMetadata?: UserMetadata;
}) {
  const identity = await getIdentityFromDatabase(params.authUserId, params.email);
  const targetMetadata = toMetadata(identity);

  const current = params.currentMetadata ?? {};
  const metadataChanged =
    !isEqualArray(current.roles, targetMetadata.roles) ||
    !isEqualArray(current.permissions, targetMetadata.permissions) ||
    (current.branchId ?? null) !== (targetMetadata.branchId ?? null) ||
    (current.divisionId ?? null) !== (targetMetadata.divisionId ?? null);

  if (!metadataChanged) return identity;

  const admin = createSupabaseAdminClient();
  if (!admin) return identity;

  const { error } = await admin.auth.admin.updateUserById(params.authUserId, {
    app_metadata: targetMetadata,
  });

  if (error) {
    // Silent by design to avoid breaking login/session API when admin key is absent.
  }

  return identity;
}

export function parseMetadataRoles(input: unknown): AppRole[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is AppRole => typeof value === "string") as AppRole[];
}

export function parseMetadataPermissions(input: unknown): PermissionCode[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is PermissionCode => typeof value === "string") as PermissionCode[];
}
