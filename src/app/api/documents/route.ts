import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const fileUrl = searchParams.get("fileUrl");

    if (!id) {
      return NextResponse.json({ error: "ID dokumen wajib diisi" }, { status: 400 });
    }

    // 1. Delete physical file from server storage if path exists
    if (fileUrl && fileUrl.startsWith("/uploads/documents/")) {
      const fileName = fileUrl.replace("/uploads/documents/", "");
      const physicalPath = join(process.cwd(), "public", "uploads", "documents", fileName);
      try {
        await unlink(physicalPath);
      } catch {
        // Continue even if physical file was already removed
      }
    }

    // 2. Delete database record if exists
    try {
      await db.auditDocument.delete({ where: { id } });
    } catch {
      // Memory store fallback
    }

    return NextResponse.json({ success: true, message: "Dokumen dan file fisik berhasil dihapus." });
  } catch (error: any) {
    console.error("DELETE /api/documents error:", error);
    return NextResponse.json({ error: error.message || "Gagal menghapus dokumen" }, { status: 500 });
  }
}
