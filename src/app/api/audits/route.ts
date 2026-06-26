import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const audits = await db.auditProject.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Transform to match frontend Audit type
    const formattedAudits = audits.map((a) => ({
      id: a.auditCode,
      name: a.name,
      branch: a.branch,
      lead: a.lead,
      status: a.status,
      progress: a.progress,
      risk: a.risk,
    }));
    return NextResponse.json(formattedAudits);
  } catch (error) {
    console.error("GET /api/audits error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, branch, lead, status, progress, risk } = body;
    
    const newAudit = await db.auditProject.create({
      data: {
        auditCode: id,
        name,
        branch,
        lead,
        status,
        progress,
        risk,
      },
    });

    return NextResponse.json({ success: true, audit: newAudit });
  } catch (error) {
    console.error("POST /api/audits error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
