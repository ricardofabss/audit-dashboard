import { NextResponse } from "next/server";
import type { SessionIdentity } from "@/types/auth";

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
    // Allow login by Username OR Email
    const user = PRESET_USERS.find(
      (u) => (u.username.toLowerCase() === inputVal || u.email.toLowerCase() === inputVal) && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { error: "Username atau password salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil",
      identity: user.identity,
    });

    // Set secure HTTP-only session cookie
    response.cookies.set("auditsphere_session", JSON.stringify(user.identity), {
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
