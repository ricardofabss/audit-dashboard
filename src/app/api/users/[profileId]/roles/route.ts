import { NextRequest, NextResponse } from "next/server";
import { getServerSessionIdentity } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/user-management";
import type { AppRole } from "@/types/auth";
import { PRESET_USERS } from "@/app/api/auth/login/route";

const allowedRoles: AppRole[] = [
  "OWNER",
  "HEAD_AUDIT",
  "AUDITOR",
  "INVESTIGATOR",
  "AUDITEE",
  "ADMIN",
];

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ profileId: string }> },
) {
  const identity = await getServerSessionIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(identity)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { profileId } = await context.params;
  const body = (await request.json()) as { roleCodes?: string[] };
  const roleCodes = [...new Set(body.roleCodes ?? [])].filter((role): role is AppRole =>
    allowedRoles.includes(role as AppRole),
  );

  if (roleCodes.length === 0) {
    return NextResponse.json({ error: "Minimal 1 role wajib dipilih." }, { status: 400 });
  }

  const user = PRESET_USERS.find(
    (u) => u.identity.profileId === profileId || u.identity.userId === profileId
  );

  if (user) {
    user.identity.roles = roleCodes;
  }

  return NextResponse.json({ ok: true, roleCodes });
}
