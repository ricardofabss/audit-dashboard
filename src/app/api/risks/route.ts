import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const risks = await db.riskRegister.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const formattedRisks = risks.map((r) => ({
      id: r.riskId,
      name: r.name,
      category: r.category,
      likelihood: r.likelihood,
      impact: r.impact,
      owner: r.owner,
      mitigation: r.mitigation,
    }));
    return NextResponse.json(formattedRisks);
  } catch (error) {
    console.error("GET /api/risks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, likelihood, impact, owner, mitigation } = body;
    
    const newRisk = await db.riskRegister.create({
      data: {
        riskId: id,
        name,
        category,
        likelihood,
        impact,
        owner,
        mitigation,
      },
    });

    return NextResponse.json({ success: true, risk: newRisk });
  } catch (error) {
    console.error("POST /api/risks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
