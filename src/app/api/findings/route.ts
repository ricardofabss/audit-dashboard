import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const findings = await db.auditFinding.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const formattedFindings = findings.map((f) => ({
      id: f.findingId,
      title: f.title,
      branch: f.branch,
      owner: f.owner,
      severity: f.severity,
      status: f.status,
      sla: f.sla,
      progress: f.progress,
      risk: f.risk,
    }));
    return NextResponse.json(formattedFindings);
  } catch (error) {
    console.error("GET /api/findings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, branch, owner, severity, status, sla, progress, risk } = body;
    
    const newFinding = await db.auditFinding.create({
      data: {
        findingId: id,
        title,
        branch,
        owner,
        severity,
        status,
        sla,
        progress,
        risk,
      },
    });

    return NextResponse.json({ success: true, finding: newFinding });
  } catch (error) {
    console.error("POST /api/findings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, progress, status } = body;
    
    const updatedFinding = await db.auditFinding.update({
      where: { findingId: id },
      data: {
        ...(progress !== undefined && { progress }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ success: true, finding: updatedFinding });
  } catch (error) {
    console.error("PUT /api/findings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
