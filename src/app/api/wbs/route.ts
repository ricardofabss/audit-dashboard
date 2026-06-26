import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const cases = await db.wbsCase.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const formattedCases = cases.map((c) => ({
      id: c.caseId,
      title: c.title,
      category: c.category,
      score: c.score,
      status: c.status,
      reporter: c.reporter,
      age: c.age,
    }));
    return NextResponse.json(formattedCases);
  } catch (error) {
    console.error("GET /api/wbs error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, category, score, status, reporter, age } = body;
    
    const newCase = await db.wbsCase.create({
      data: {
        caseId: id,
        title,
        category,
        score,
        status,
        reporter,
        age,
      },
    });

    return NextResponse.json({ success: true, wbsCase: newCase });
  } catch (error) {
    console.error("POST /api/wbs error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
