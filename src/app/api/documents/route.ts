import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const documents = await db.auditDocument.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const formattedDocuments = documents.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      version: d.version,
      owner: d.owner,
      modified: d.modified,
    }));
    return NextResponse.json(formattedDocuments);
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, version, owner, modified } = body;
    
    const newDoc = await db.auditDocument.create({
      data: {
        name,
        type,
        version,
        owner,
        modified,
      },
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
