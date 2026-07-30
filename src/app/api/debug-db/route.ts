import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const eventsCount = await (db as any).contractLifecycleEvent.count();
    const risksCount = await (db as any).riskRegister.count();
    const auditsCount = await (db as any).auditProject.count();

    return NextResponse.json({
      status: "online",
      database: "connected",
      records: {
        contractLifecycleEvent: eventsCount,
        riskRegister: risksCount,
        auditProject: auditsCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
