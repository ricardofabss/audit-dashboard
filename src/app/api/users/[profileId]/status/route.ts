import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionIdentity } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/user-management";

const schema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const identity = await getServerSessionIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(identity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
