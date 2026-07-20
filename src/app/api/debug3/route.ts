import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("http://localhost:3000/api/risk-intelligence?buId=bu-pg-gmn", { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ status: res.status, error: text }, { status: 200 });
    }
    const data = await res.json();
    
    return NextResponse.json({
      MAGIC: "FULL_PAYLOAD",
      rulesCount: data.anomalyRules.length,
      anomalyRules: data.anomalyRules,
      anomalyDetectionsLength: data.anomalyDetections?.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 200 });
  }
}
