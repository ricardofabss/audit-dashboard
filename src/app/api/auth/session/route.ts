import { NextResponse } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/auth/env";
import { getServerSessionIdentity } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { syncIdentityToSupabaseMetadata } from "@/lib/auth/identity-sync";

export async function GET() {
  // FORCE BYPASS for prototype
  if (true) {
    const identity = await getServerSessionIdentity();
    return NextResponse.json({ identity });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        await syncIdentityToSupabaseMetadata({
          authUserId: user!.id,
          email: user!.email ?? null,
          currentMetadata: {
            roles: Array.isArray(user?.app_metadata?.roles) ? user!.app_metadata.roles : [],
            permissions: Array.isArray(user?.app_metadata?.permissions)
              ? user!.app_metadata.permissions
              : [],
            branchId:
              typeof user?.app_metadata?.branchId === "string" ? user!.app_metadata.branchId : null,
            divisionId:
              typeof user?.app_metadata?.divisionId === "string"
                ? user!.app_metadata.divisionId
                : null,
          },
        });
      } catch {
        // Keep session endpoint responsive even when direct DB connectivity is unavailable.
      }
    }
  } catch {
    // Supabase is unreachable — fall through to getServerSessionIdentity
  }

  const identity = await getServerSessionIdentity();
  return NextResponse.json({ identity });
}
