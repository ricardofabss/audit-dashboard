import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branchSummaryData } = body;

    if (!branchSummaryData || !Array.isArray(branchSummaryData)) {
      return NextResponse.json({ error: "Branch summary data is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 400 });
    }

    // Hitung statistik agregat
    const totalBranches = branchSummaryData.length;
    const criticalBranches = branchSummaryData.filter((b: any) => b.level === "CRITICAL").length;
    const highBranches = branchSummaryData.filter((b: any) => b.level === "HIGH").length;
    const totalAnomalies = branchSummaryData.reduce((sum: number, b: any) => sum + b.anomali, 0);

    const dbDumpString = JSON.stringify(branchSummaryData);

    // Construct System Prompt
    const systemPrompt = `Anda adalah Penasihat Strategis (Strategic Advisor) untuk Chief Audit Executive di sebuah Holding Multinasional.
Misi Anda adalah membaca data keseluruhan (Helicopter View) dari seluruh cabang yang ada, lalu memberikan "Executive Summary" yang tajam dan taktis.

STATISTIK AGREGAT NASIONAL:
- Total Cabang Dievaluasi: ${totalBranches}
- Total Anomali Aktif Nasional: ${totalAnomalies}
- Cabang Status Kritis (CRITICAL): ${criticalBranches}
- Cabang Status Bahaya (HIGH): ${highBranches}

DATA CABANG TERBURUK (Berdasarkan Skor Risiko Tertinggi):
${dbDumpString}

INSTRUKSI OUTPUT (Berikan dalam Bahasa Indonesia Formal & Profesional):
Buatlah "Executive Summary" (Maksimal 3 paragraf pendek) yang mencakup:
1. **Status Kesehatan Nasional**: Berikan pandangan 1 kalimat tentang status kesehatan cabang secara keseluruhan berdasarkan statistik di atas.
2. **Wilayah / Cabang Paling Mengkhawatirkan**: Sebutkan nama 2-3 cabang atau wilayah yang kondisinya paling parah dan mendominasi total anomali/skor risiko.
3. **Rekomendasi Alokasi Auditor (Prioritas)**: Berikan rekomendasi tegas ke mana tim Audit Holding harus dikirim untuk melakukan "Surprise Field Audit" (Sidak) bulan ini guna memitigasi kerugian terbesar.

Jangan gunakan basa-basi, jangan ulangi statistik secara berlebihan. Langsung ke inti (to the point). Gunakan format yang mudah dibaca oleh Direksi.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Failed to generate AI executive summary via API");
    }

    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak mengembalikan respon.";
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("AI Branch Summarization Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI executive summary", details: error.message },
      { status: 500 }
    );
  }
}
