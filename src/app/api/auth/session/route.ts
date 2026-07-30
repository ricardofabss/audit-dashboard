import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { SessionIdentity } from "@/types/auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("auditsphere_session");

  if (!sessionCookie || !sessionCookie.value) {
    return NextResponse.json({ identity: null });
  }

  try {
    const identity = JSON.parse(sessionCookie.value) as SessionIdentity;
    return NextResponse.json({ identity });
  } catch {
    return NextResponse.json({ identity: null });
  }
}
