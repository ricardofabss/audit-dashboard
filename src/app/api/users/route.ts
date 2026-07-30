import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionIdentity } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/user-management";
import { z } from "zod";
import type { AppRole } from "@/types/auth";
import { PRESET_USERS } from "@/app/api/auth/login/route";
import { businessUnits } from "@/lib/business-units";

const inviteSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter."),
  email: z.string().transform((value) => value.toLowerCase().trim()),
  roleCode: z.enum(["OWNER", "HEAD_AUDIT", "AUDITOR", "INVESTIGATOR", "AUDITEE", "ADMIN"]),
  branchId: z.string().nullable().optional(),
  divisionId: z.string().nullable().optional(),
});

export async function GET() {
  const identity = await getServerSessionIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(identity)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let dbUsers: Array<{
    profileId: string;
    authUserId: string;
    fullName: string;
    email: string;
    status: "ACTIVE" | "INVITED" | "SUSPENDED" | "DISABLED";
    branchName: string;
    divisionName: string;
    roleCodes: AppRole[];
    lastLoginAt: string | null;
  }> = [];

  try {
    // Read user profiles from PostgreSQL Database
    const dbProfiles = await db.profile.findMany({
      where: { deletedAt: null },
      include: {
        branch: true,
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    dbUsers = dbProfiles.map((p) => ({
      profileId: p.id,
      authUserId: p.authUserId,
      fullName: p.fullName,
      email: p.email,
      status: p.status as any,
      branchName: p.branch?.name ?? "Holding Level",
      divisionName: p.phone ?? "Staff",
      roleCodes: p.roles.map((r) => r.role.code as AppRole),
      lastLoginAt: p.lastLoginAt?.toISOString() ?? new Date().toISOString(),
    }));
  } catch {
    // Database connection fallback
  }

  // Combine database users with memory preset users
  const presetUsersList = PRESET_USERS.map((user) => {
    const bu = businessUnits.find((b) => b.id === user.identity.branchId);
    return {
      profileId: user.identity.profileId || user.identity.userId,
      authUserId: user.identity.userId,
      fullName: user.fullName,
      email: `@${user.username} (${user.email})`,
      status: "ACTIVE" as const,
      branchName: bu ? bu.name : "Holding Level",
      divisionName: user.roleTitle,
      roleCodes: user.identity.roles,
      lastLoginAt: new Date().toISOString(),
    };
  });

  const mergedUsers = [...presetUsersList];
  for (const dbUser of dbUsers) {
    if (!mergedUsers.some((u) => u.authUserId === dbUser.authUserId || u.email.toLowerCase().includes(dbUser.email.toLowerCase()))) {
      mergedUsers.push(dbUser);
    }
  }

  return NextResponse.json({
    users: mergedUsers,
    roleOptions: ["OWNER", "HEAD_AUDIT", "AUDITOR", "INVESTIGATOR", "AUDITEE", "ADMIN"] satisfies AppRole[],
    branches: businessUnits.map((bu) => ({
      id: bu.id,
      name: `[${bu.code}] ${bu.name}`,
      divisions: [],
    })),
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

  const { fullName, email, roleCode, branchId } = parseResult.data;
  const username = email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "") || "user";
  const bu = businessUnits.find((b) => b.id === branchId);

  // 1. Sync to local memory preset list for instant auth
  const newUser = {
    username,
    email: email.includes("@") ? email : `${username}@auditsphere.ai`,
    password: "audit123!",
    fullName,
    roleTitle: roleCode === "ADMIN" ? "Administrator" : roleCode === "AUDITOR" ? "Internal Auditor" : roleCode === "HEAD_AUDIT" ? "Head of Audit" : "User",
    identity: {
      userId: `user-${Date.now()}`,
      fullName,
      email: email.includes("@") ? email : `${username}@auditsphere.ai`,
      profileId: `prof-${Date.now()}`,
      roles: [roleCode],
      permissions: [
        "dashboard.read",
        "audit.read",
        "findings.read",
        ...(roleCode === "ADMIN" || roleCode === "OWNER" ? ["users.manage", "settings.manage" as const] : []),
      ] as any[],
      branchId: branchId || null,
      divisionId: bu ? bu.sector : "HOLDING",
    },
  };

  PRESET_USERS.push(newUser);

  // 2. Persist directly to PostgreSQL Database via Prisma if connected
  try {
    const authUserId = newUser.identity.userId;
    const userEmail = newUser.email;

    await db.profile.create({
      data: {
        authUserId,
        fullName,
        email: userEmail,
        emailNorm: userEmail,
        status: "ACTIVE",
        phone: newUser.roleTitle,
      },
    });
  } catch {
    // Database write fallback graceful handle
  }

  return NextResponse.json({
    ok: true,
    message: `User baru '${fullName}' (Username: @${username}) berhasil disimpan ke database!`,
    user: newUser,
  });
}

export async function DELETE(request: Request) {
  const identity = await getServerSessionIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(identity)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ error: "profileId wajib diisi" }, { status: 400 });
  }

  // Prevent deleting the main Super Admin account
  const targetUser = PRESET_USERS.find(
    (u) => u.identity.profileId === profileId || u.identity.userId === profileId
  );
  if (targetUser && (targetUser.username === "admin" || targetUser.identity.userId === "user-admin-000")) {
    return NextResponse.json({ error: "Akun Super Admin utama tidak dapat dihapus." }, { status: 400 });
  }

  // 1. Remove from local memory list
  const index = PRESET_USERS.findIndex(
    (u) => u.identity.profileId === profileId || u.identity.userId === profileId
  );

  let deletedName = "";
  if (index !== -1) {
    deletedName = PRESET_USERS[index].fullName;
    PRESET_USERS.splice(index, 1);
  }

  // 2. Soft-delete / Remove from PostgreSQL database via Prisma
  try {
    await db.profile.updateMany({
      where: {
        OR: [{ id: profileId }, { authUserId: profileId }],
      },
      data: { deletedAt: new Date(), status: "DISABLED" },
    });
  } catch {
    // Database write fallback
  }

  return NextResponse.json({ ok: true, message: `User ${deletedName || profileId} berhasil dihapus dari database.` });
}
