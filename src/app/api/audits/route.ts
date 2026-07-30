import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const audits = await (db as any).auditProject.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Transform to match frontend Audit type
    const formattedAudits = audits.map((a: any) => ({
      id: a.auditCode,
      name: a.name,
      branch: a.branch,
      lead: a.lead,
      status: a.status,
      progress: a.progress,
      risk: a.risk,
      period: a.period || undefined,
      dueDate: a.dueDate || undefined,
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
    const { id, name, branch, lead, status, progress, risk, period, dueDate } = body;
    
    const newAudit = await (db as any).auditProject.create({
      data: {
        auditCode: id,
        name,
        branch,
        lead,
        status,
        progress,
        risk,
        period,
        dueDate,
      },
    });

    return NextResponse.json({ success: true, audit: newAudit });
  } catch (error) {
    console.error("POST /api/audits error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await (db as any).auditProject.deleteMany({
      where: { auditCode: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/audits error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, branch, lead, status, progress, risk, period, dueDate } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await (db as any).auditProject.updateMany({
      where: { auditCode: id },
      data: {
        ...(name !== undefined && { name }),
        ...(branch !== undefined && { branch }),
        ...(lead !== undefined && { lead }),
        ...(status !== undefined && { status }),
        ...(progress !== undefined && { progress }),
        ...(risk !== undefined && { risk }),
        ...(period !== undefined && { period }),
        ...(dueDate !== undefined && { dueDate }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/audits error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
