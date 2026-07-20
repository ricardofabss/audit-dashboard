import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branch, branchAnomalies, databaseDump, topGlobalPatterns } = body;

    if (!branch) {
      return NextResponse.json({ error: "Branch data is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 400 });
    }

    const dbDumpString = JSON.stringify(databaseDump || []);

    // Construct System Prompt
    const systemPrompt = `Anda adalah Asisten Kepala Internal Audit (Chief Audit Executive) di sebuah perusahaan Holding Multinasional.
Misi Anda adalah menganalisis "Kesehatan dan Risiko Cabang" berdasarkan metrik kuantitatif dan rincian anomali aktual yang terjadi, lalu memberikan kesimpulan kinerja pimpinan cabang beserta rekomendasi taktis.

POLA DATABASE GLOBAL (TREN NASIONAL):
Sebagai referensi, ini adalah 3 pola fraud/anomali yang paling sering ditemukan di *seluruh database perusahaan* saat ini:
${topGlobalPatterns}

DETAIL PROFIL CABANG:
- Nama Cabang: ${branch.branchName} (${branch.outletCode})
- Regional/Area: ${branch.regionName} / ${branch.areaName}
- Total Skor Risiko: ${branch.totalScore}/100 (Tingkat: ${branch.riskLevel})
- Tren Risiko: ${branch.trendDirection} (${branch.trend > 0 ? "+" : ""}${branch.trend} poin)
- Kepadatan Anomali: ${branch.anomalyDensity} per 100 transaksi
- Total Anomali Aktif: ${branch.anomalyCount} (Tingkat Nasabah Berisiko Tinggi: ${branch.highRiskCustomerCount} dari ${branch.customerCount} nasabah)

CONTOH ANOMALI TERTINGGI YANG DITEMUKAN DI CABANG INI:
${branchAnomalies || "- Belum ada data anomali spesifik yang tercatat."}

REFERENSI DATABASE MENTAH (STUDI KASUS UNTUK ANDA PELAJARI):
Berikut adalah cuplikan data seluruh anomali di perusahaan kami. Pelajari pola dari data ini (misal: cabang mana yang sering muncul, atau rule apa yang sering dilanggar) untuk menambah wawasan Anda dalam memberikan rekomendasi.
Database: ${dbDumpString}

INSTRUKSI OUTPUT (Berikan dalam Bahasa Indonesia Formal & Singkat):
Buatlah laporan singkat (maksimal 2 paragraf pendek):
1. **Akar Permasalahan Cabang**: Berdasarkan jenis anomali aktual yang ditemukan di atas (Contoh Anomali Tertinggi) DAN wawasan Anda setelah mempelajari "Referensi Database Mentah", buat rangkuman tajam tentang kelemahan utama cabang ini.
2. **Rekomendasi Audit**: Berikan rekomendasi yang tegas berdasarkan tingkat keparahan anomali. Jika parah/kritis, wajibkan "Surprise Field Audit" (Sidak Lapangan) untuk memeriksa area yang spesifik. Jika masih wajar, rekomendasikan "Desk Audit" atau pembinaan.

Jangan gunakan basa-basi. Langsung ke inti masalah.`;

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
      throw new Error(data.error.message || "Failed to generate AI recommendation via API");
    }

    const recommendation = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak mengembalikan respon.";
    return NextResponse.json({ recommendation });
  } catch (error: any) {
    console.error("AI Branch Investigation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI recommendation", details: error.message },
      { status: 500 }
    );
  }
}
