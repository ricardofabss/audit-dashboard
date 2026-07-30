import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let risks = await (db as any).riskRegister.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    // Auto-seed database if empty
    if (risks.length === 0) {
      const initialRisks = [
        { riskId: "RSK-01", name: "Privileged access misuse", category: "Technology", likelihood: 5, impact: 5, owner: "CISO Office", mitigation: 62 },
        { riskId: "RSK-02", name: "Fictitious vendor scheme", category: "Procurement", likelihood: 4, impact: 5, owner: "Finance Ops", mitigation: 41 },
        { riskId: "RSK-03", name: "Regulatory filing delay", category: "Compliance", likelihood: 3, impact: 4, owner: "Legal", mitigation: 72 },
        { riskId: "RSK-04", name: "Evidence retention gap", category: "Audit Quality", likelihood: 3, impact: 3, owner: "Internal Audit", mitigation: 55 },
      ];
      for (const item of initialRisks) {
        await (db as any).riskRegister.create({ data: item }).catch(() => {});
      }
      risks = await (db as any).riskRegister.findMany({ orderBy: { createdAt: "desc" } });
    }

    const formattedRisks = risks.map((r: any) => ({
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
    
    const newRisk = await (db as any).riskRegister.create({
      data: {
        riskId: id,
        name,
        category,
        likelihood,
        impact,
        owner,
        mitigation: mitigation || 0,
      },
    });

    return NextResponse.json({ success: true, risk: newRisk });
  } catch (error) {
    console.error("POST /api/risks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
