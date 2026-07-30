import { NextResponse } from "next/server";
import { getServerSessionIdentity } from "@/lib/auth/session";
import { PRESET_USERS } from "@/app/api/auth/login/route";

export async function POST(request: Request) {
  try {
    const identity = await getServerSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized. Silakan login kembali." }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Password lama dan password baru wajib diisi." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password baru minimal 6 karakter." }, { status: 400 });
    }

    // Match logged-in user in memory store by userId, email, profileId, or username
    const user = PRESET_USERS.find(
      (u) =>
        u.identity.userId === identity.userId ||
        u.identity.profileId === identity.profileId ||
        (identity.email && u.email.toLowerCase() === identity.email.toLowerCase()) ||
        (identity.email && u.username.toLowerCase() === identity.email.toLowerCase())
    );

    if (!user) {
      // Fallback: If logged in as admin/first user, match admin account directly
      const adminUser = PRESET_USERS.find((u) => u.username === "admin" || u.email === "admin@auditsphere.ai");
      if (adminUser) {
        if (adminUser.password !== oldPassword) {
          return NextResponse.json({ error: "Password lama yang Anda masukkan tidak cocok." }, { status: 400 });
        }
        adminUser.password = newPassword;
        return NextResponse.json({
          success: true,
          message: "Password Admin berhasil diperbarui! Gunakan password baru saat login berikutnya.",
        });
      }
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    if (user.password !== oldPassword) {
      return NextResponse.json({ error: "Password lama yang Anda masukkan tidak cocok." }, { status: 400 });
    }

    // Update user password in local credentials store
    user.password = newPassword;

    return NextResponse.json({
      success: true,
      message: "Password berhasil diperbarui! Gunakan password baru saat login berikutnya.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal mengubah password" }, { status: 500 });
  }
}
