import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionIdentity } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/user-management";
import { createSupabaseAdminClient } from "@/lib/auth/supabase-admin";

export async function POST(
  _request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const identity = await getServerSessionIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(identity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase service role key belum dikonfigurasi di server." },
      { status: 500 },
    );
  }

  const { profileId } = await context.params;
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { email: true, status: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile tidak ditemukan." }, { status: 404 });
  if (profile.status !== "INVITED") {
    return NextResponse.json(
      { error: "Resend invite hanya untuk user status INVITED." },
      { status: 400 },
    );
  }

  const redirectTo = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : undefined;
  const { error } = await admin.auth.admin.inviteUserByEmail(profile.email, { redirectTo });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
