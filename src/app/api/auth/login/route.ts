import { NextResponse } from "next/server";
import type { SessionIdentity } from "@/types/auth";
import { db } from "@/lib/db";

export const PRESET_USERS: Array<{
  username: string;
  email: string;
  password: string;
  fullName: string;
  roleTitle: string;
  identity: SessionIdentity;
}> = [
  {
    username: "admin",
    email: "admin@auditsphere.ai",
    password: "admin123!",
    fullName: "System Administrator",
    roleTitle: "Super Admin",
    identity: {
      userId: "user-admin-000",
      fullName: "System Administrator",
      email: "admin@auditsphere.ai",
      profileId: "prof-admin-000",
      roles: ["ADMIN", "OWNER"],
      permissions: [
        "dashboard.read",
        "audit.read",
        "audit.execute",
        "findings.read",
        "findings.manage",
        "wbs.read",
        "investigation.read",
        "risk.read",
        "compliance.read",
        "followup.read",
        "users.manage",
        "settings.manage",
      ],
      branchId: null,
      divisionId: "DIV-ADMIN-HOLDING",
    },
  },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi." }, { status: 400 });
    }

    const inputVal = String(username).trim().toLowerCase();

    // 1. First check in memory PRESET_USERS
    let matchedUser = PRESET_USERS.find(
      (u) => (u.username.toLowerCase() === inputVal || u.email.toLowerCase() === inputVal) && u.password === password
    );

    // 2. If not found in memory, query PostgreSQL Database via Prisma
    if (!matchedUser) {
      try {
        const dbProfile = await db.profile.findFirst({
          where: {
            OR: [
              { email: { equals: inputVal, mode: "insensitive" } },
              { emailNorm: { equals: inputVal, mode: "insensitive" } },
              { authUserId: inputVal },
            ],
            deletedAt: null,
          },
          include: {
            roles: { include: { role: true } },
          },
        });

        if (dbProfile) {
          const userPassword = dbProfile.avatarUrl || "audit123!";
          if (userPassword === password) {
            const roleCodes = dbProfile.roles.map((r) => r.role.code as any);
            matchedUser = {
              username: dbProfile.email.split("@")[0],
              email: dbProfile.email,
              password: userPassword,
              fullName: dbProfile.fullName,
              roleTitle: dbProfile.phone || "User",
              identity: {
                userId: dbProfile.authUserId,
                fullName: dbProfile.fullName,
                email: dbProfile.email,
                profileId: dbProfile.id,
                roles: roleCodes.length > 0 ? roleCodes : ["AUDITOR"],
                permissions: [
                  "dashboard.read",
                  "audit.read",
                  "findings.read",
                  ...(roleCodes.includes("ADMIN") || roleCodes.includes("OWNER") ? ["users.manage", "settings.manage" as const] : []),
                ] as any[],
                branchId: dbProfile.branchId,
                divisionId: dbProfile.divisionId,
              },
            };
          }
        }
      } catch {
        // Database query fallback
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: "Username atau password salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    const userIdentity: SessionIdentity = {
      ...matchedUser.identity,
      fullName: matchedUser.fullName,
    };

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil",
      identity: userIdentity,
    });

    // Set secure HTTP-only session cookie
    response.cookies.set("auditsphere_session", JSON.stringify(userIdentity), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal memproses login" }, { status: 500 });
  }
}
