import { db } from "@/lib/db";
import type { SessionIdentity } from "@/types/auth";

export async function getIdentityFromDatabase(
  authUserId: string,
  email: string | null,
): Promise<SessionIdentity> {
  const profile = await db.profile.findUnique({
    where: { authUserId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!profile) {
    return {
      userId: authUserId,
      email,
      profileId: null,
      roles: [],
      permissions: [],
      branchId: null,
      divisionId: null,
    };
  }

  const roleSet = new Set<string>();
  const permissionSet = new Set<string>();
  for (const profileRole of profile.roles) {
    roleSet.add(profileRole.role.code);
    for (const rolePermission of profileRole.role.permissions) {
      permissionSet.add(rolePermission.permission.code);
    }
  }

  return {
    userId: authUserId,
    email,
    profileId: profile.id,
    roles: Array.from(roleSet) as SessionIdentity["roles"],
    permissions: Array.from(permissionSet) as SessionIdentity["permissions"],
    branchId: profile.branchId ?? null,
    divisionId: profile.divisionId ?? null,
  };
}
