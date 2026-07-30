import { cookies } from "next/headers";
import type { SessionIdentity } from "@/types/auth";

export async function getServerSessionIdentity(): Promise<SessionIdentity | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auditsphere_session");

    if (sessionCookie && sessionCookie.value) {
      return JSON.parse(sessionCookie.value) as SessionIdentity;
    }
  } catch {
    // Cookie read fallback
  }

  // Strictly require valid session cookie (No fallback for production security)
  return null;
}
