import { NextRequest, NextResponse } from "next/server";
import { getConsolidatedMockData, getMockDataForBU } from "@/lib/risk-mock-data";

// Data masking utility
function maskSensitiveData(anomaly: any) {
  const masked = { ...anomaly };
  if (masked.entityName && masked.entityType === "CUSTOMER") {
    const parts = masked.entityName.split(" ");
    masked.entityName = parts.map((p: string) => p.charAt(0) + "***").join(" ");
  }
  if (masked.entityId && masked.entityType === "CUSTOMER") {
    masked.entityId = masked.entityId.slice(0, 4) + "****" + masked.entityId.slice(-4);
  }
  return masked;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { anomaly } = body;

    if (!anomaly) {
      return NextResponse.json({ error: "Anomaly data is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 400 });
    }

    // Mask PII
    const safeAnomaly = maskSensitiveData(anomaly);

    // Get macro context
    const allData = anomaly.businessUnitId 
      ? getMockDataForBU(anomaly.businessUnitId, anomaly.sector)
      : getConsolidatedMockData();

    const branchHistory = allData.anomalyDetections.filter(
      (a: any) => a.outletCode === anomaly.outletCode || a.branchName === anomaly.branchName
    );
    const ruleHistory = allData.anomalyDetections.filter(
      (a: any) => a.ruleCode === anomaly.ruleCode
    );

    const branchFraudCount = branchHistory.filter((a: any) => a.status === "CONFIRMED").length;
    
    // Construct System Prompt
    const systemPrompt = `Anda adalah Asisten Auditor Investigasi Senior di level Holding.
Misi Anda adalah membaca detail sebuah anomali dan konteks historisnya, lalu memberikan rekomendasi investigasi yang realistis secara biaya (cost-effective).

INFORMASI PENTING (ATURAN BISNIS HOLDING):
- Internal Audit Holding SANGAT JARANG turun lapangan (field audit) hanya untuk 1 anomali perorangan karena biaya operasionalnya sangat besar.
- Turun lapangan HANYA dibenarkan jika cabang tersebut memiliki indikasi fraud sistematis, jumlah anomali historis yang banyak, atau tingkat keparahan yang mengancam kelangsungan bisnis.
- Jika jumlah anomali di cabang ini masih sedikit, rekomendasikan "Desk Audit" (Pemeriksaan Jarak Jauh/Klarifikasi Data) terlebih dahulu, BUKAN turun lapangan.

KONTEKS HISTORIS (MACRO DATA):
- Total anomali historis di cabang ini: ${branchHistory.length}
- Jumlah fraud yang terbukti (CONFIRMED) di cabang ini sebelumnya: ${branchFraudCount}
- Tren Nasional untuk pelanggaran ini (${anomaly.ruleCode}): Terjadi ${ruleHistory.length} kali di seluruh Bisnis Unit.

DETAIL ANOMALI SAAT INI:
- Rule: ${safeAnomaly.ruleCode} - ${safeAnomaly.ruleName}
- Cabang: ${safeAnomaly.branchName} (${safeAnomaly.outletCode})
- Entitas Terlibat: ${safeAnomaly.entityName} (Tipe: ${safeAnomaly.entityType})
- Skor Risiko: ${safeAnomaly.riskScore}/100
- Deskripsi: ${safeAnomaly.description}
- Metadata Dukungan: ${JSON.stringify(safeAnomaly.metadata)}

INSTRUKSI OUTPUT (Berikan dalam Bahasa Indonesia Formal & Profesional):
1. **Identifikasi Akar Masalah & Konteks**: Berikan 1 paragraf analisis Anda dengan mengaitkan Anomali Saat Ini dengan Konteks Historis cabang/nasional.
2. **Tingkat Bahaya & Keputusan Turun Lapangan**: Tentukan tingkat bahaya (Rendah/Menengah/Tinggi/Kritis). Berdasarkan total anomali cabang (${branchHistory.length}), tegaskan apakah ini layak untuk "Turun Lapangan (Field Audit)" atau cukup "Audit Jarak Jauh (Desk Audit)". Berikan alasan singkat.
3. **Instruksi Uji Petik**: Berikan 3 poin langkah investigasi spesifik yang harus dilakukan auditor (baik secara remote maupun lapangan) berdasarkan data ini.
Jangan gunakan format Markdown yang terlalu kompleks, gunakan format teks yang bersih dan mudah dibaca.
`;

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
    console.error("AI Investigation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI recommendation", details: error.message },
      { status: 500 }
    );
  }
}
