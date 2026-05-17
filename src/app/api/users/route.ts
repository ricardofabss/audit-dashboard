import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionIdentity } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/auth/supabase-admin";
import { syncIdentityToSupabaseMetadata } from "@/lib/auth/identity-sync";
import { canManageUsers } from "@/lib/auth/user-management";
import { z } from "zod";
import type { AppRole } from "@/types/auth";

const inviteSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter."),
  email: z.email("Email tidak valid.").transform((value) => value.toLowerCase().trim()),
  roleCode: z.enum(["OWNER", "HEAD_AUDIT", "AUDITOR", "INVESTIGATOR", "AUDITEE", "ADMIN"]),
  branchId: z.string().uuid().nullable().optional(),
  divisionId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  const identity = await getServerSessionIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(identity)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profiles = await db.profile.findMany({
    where: { deletedAt: null },
    include: {
      branch: true,
      division: true,
      roles: {
        where: { deletedAt: null },
        include: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const branches = await db.branch.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      divisions: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({
    users: profiles.map((profile) => ({
      profileId: profile.id,
      authUserId: profile.authUserId,
      fullName: profile.fullName,
      email: profile.email,
      status: profile.status,
      branchName: profile.branch?.name ?? "-",
      divisionName: profile.division?.name ?? "-",
      roleCodes: profile.roles.map((item) => item.role.code),
      lastLoginAt: profile.lastLoginAt?.toISOString() ?? null,
    })),
    roleOptions: ["OWNER", "HEAD_AUDIT", "AUDITOR", "INVESTIGATOR", "AUDITEE", "ADMIN"] satisfies AppRole[],
    branches,
  });
}

export async function POST(request: Request) {
  const identity = await getServerSessionIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(identity)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parseResult = inviteSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message ?? "Payload tidak valid." },
      { status: 400 },
    );
  }

  const { fullName, email, roleCode, branchId, divisionId } = parseResult.data;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase service role key belum dikonfigurasi di server." },
      { status: 500 },
    );
  }

  if (divisionId) {
    const division = await db.division.findUnique({ where: { id: divisionId } });
    if (!division || (branchId && division.branchId !== branchId)) {
      return NextResponse.json({ error: "Divisi tidak cocok dengan branch." }, { status: 400 });
    }
  }

  const role = await db.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    return NextResponse.json({ error: "Role tidak ditemukan." }, { status: 400 });
  }

  const redirectTo = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : undefined;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo,
  });

  if (inviteError || !invited.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Gagal mengirim undangan user." },
      { status: 400 },
    );
  }

  const authUserId = invited.user.id;

  const profile = await db.profile.upsert({
    where: { authUserId },
    update: {
      fullName,
      email,
      emailNorm: email,
      status: "INVITED",
      branchId: branchId ?? null,
      divisionId: divisionId ?? null,
      deletedAt: null,
    },
    create: {
      authUserId,
      fullName,
      email,
      emailNorm: email,
      status: "INVITED",
      branchId: branchId ?? null,
      divisionId: divisionId ?? null,
    },
  });

  await db.$transaction(async (tx) => {
    await tx.profileRole.deleteMany({ where: { profileId: profile.id } });
    await tx.profileRole.create({
      data: {
        profileId: profile.id,
        roleId: role.id,
      },
    });
  });

  await syncIdentityToSupabaseMetadata({
    authUserId,
    email,
  });

  return NextResponse.json({ ok: true });
}
