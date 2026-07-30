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

  // Fallback default admin identity
  return {
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
  };
}
