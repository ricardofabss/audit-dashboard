import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionIdentity } from "@/lib/auth/session";
import { syncIdentityToSupabaseMetadata } from "@/lib/auth/identity-sync";
import { canManageUsers } from "@/lib/auth/user-management";
import type { AppRole } from "@/types/auth";

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

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true, authUserId: true, email: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile tidak ditemukan." }, { status: 404 });
  }

  const roles = await db.role.findMany({
    where: { code: { in: roleCodes }, deletedAt: null },
    select: { id: true, code: true },
  });
  if (roles.length !== roleCodes.length) {
    return NextResponse.json({ error: "Ada role yang tidak valid." }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.profileRole.deleteMany({ where: { profileId } });
    await tx.profileRole.createMany({
      data: roles.map((role) => ({
        profileId,
        roleId: role.id,
      })),
    });
  });

  await syncIdentityToSupabaseMetadata({
    authUserId: profile.authUserId,
    email: profile.email,
  });

  return NextResponse.json({ ok: true, roleCodes });
}
