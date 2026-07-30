import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getServerSessionIdentity } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const identity = await getServerSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("type") as string) || "Evidence Pack";
    const version = (formData.get("version") as string) || "v1.0";
    const buScope = (formData.get("buScope") as string) || "ALL";

    if (!file) {
      return NextResponse.json({ error: "File dokumen wajib diunggah." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads", "documents");
    await mkdir(uploadsDir, { recursive: true });

    const timeStamp = Date.now();
    const safeFileName = `${timeStamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = join(uploadsDir, safeFileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/documents/${safeFileName}`;
    const fileSizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " MB";

    const docRecord = {
      id: `doc-${timeStamp}`,
      name: file.name,
      type: documentType,
      version: version,
      owner: identity.fullName || identity.email || "Auditor",
      modified: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      fileUrl: fileUrl,
      fileSize: fileSizeFormatted,
      fileType: file.type || "application/octet-stream",
      buScope: buScope,
    };

    return NextResponse.json({ success: true, document: docRecord });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengunggah berkas." }, { status: 500 });
  }
}
