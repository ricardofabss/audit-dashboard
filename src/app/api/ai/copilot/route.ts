import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businessUnits, sectorMeta } from "@/lib/business-units";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, activeBUId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const latestUserMessage = messages[messages.length - 1]?.content || "";
    const activeBU = businessUnits.find((b) => b.id === activeBUId);

    // Load contextual database stats for grounding
    let dbSummary: any = null;
    try {
      const anomalyCount = await db.contractLifecycleEvent.count({ where: { deletedAt: null } });
      const recentEvents = await db.contractLifecycleEvent.findMany({
        where: { deletedAt: null },
        orderBy: { eventDate: "desc" },
        take: 10,
        select: {
          contractNo: true,
          businessUnit: true,
          branchName: true,
          outletCode: true,
          eventDate: true,
          eventType: true,
          loanInitial: true,
        },
      });

      dbSummary = {
        totalRecords: anomalyCount,
        recentSamples: recentEvents,
      };
    } catch (e) {
      console.warn("[Copilot API] DB Context fetch warning:", e);
    }

    // Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const systemPrompt = `Anda adalah Senior Internal Audit Consultant, Enterprise Risk Consultant, dan Chief Risk Officer (CRO) AI Assistant di AuditSphere AI Holding.
Anda berbicara secara interaktif, profesional, tajam, dan langsung pada inti masalah (actionable insight) dalam Bahasa Indonesia.

KONTEKS SAAT INI:
- Active Filter: ${activeBU ? `${activeBU.name} (${activeBU.code}) — Sektor ${sectorMeta[activeBU.sector].labelId}` : "All Business Units (Konsolidasi Holding)"}
- Database Live Status: ${dbSummary ? `${dbSummary.totalRecords} event transaksi tercatat` : "Database terhubung"}

ATURAN BISNIS & ATURAN ANOMALI AUDIT:
1. Pergadaian (A01: High Freq Pawn, A02: Short Aging Large Loan, A03: Top-Up Renewal Chain, A04: Extreme LTV Jump, A05: Early Settlement Lunas Tebus, A06: Off-Hours Transaction, A07: Cross-Branch Pawn).
2. Otomotif (O01: End-of-month Sales Spike / Pending Sales, O02: Dominant Leasing Monopoly, O04: Workshop Mechanic Inequality, O05: STNK Name Mismatch).
3. Multifinance (M01-M09: Overdue Aging, Fiktif Debitur, Insurance Claim Anomaly).

PETUNJUK BALASAN:
- Jawab pertanyaan pengguna secara kontekstual, percakapan natural (multi-turn chat).
- Berikan saran konkret langkah audit (misal: Surprise Field Audit, Verifikasi Fisik Agunan, Wawancara Otorisasi, Desk Audit, WBS Escalation).
- Format balasan dengan Markdown rapi (gunakan bold **kata kunci**, bullet points, dan emoji profesional).`;

        // Format history for Gemini contents API
        const contents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Siap. Saya AuditSphere AI Risk Copilot. Bagaimana saya dapat membantu Anda menganalisis risiko dan merencanakan langkah audit hari ini?" }] },
          ...messages.map((m: any) => ({
            role: m.sender === "user" || m.role === "user" ? "user" : "model",
            parts: [{ text: m.content || m.text || "" }],
          })),
        ];

        // Call Gemini API (Try gemini-2.5-flash first, fallback to gemini-1.5-flash)
        let geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
          }
        );

        if (!geminiRes.ok) {
          geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents }),
            }
          );
        }

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return NextResponse.json({ reply: replyText, source: "gemini" });
          }
        }
      } catch (geminiErr) {
        console.error("[Copilot API] Gemini invocation error, falling back to expert rule engine:", geminiErr);
      }
    }

    // ─── Local Intelligent Fallback Engine ────────────────────────────────
    const reply = generateLocalCopilotReply(latestUserMessage, activeBU, dbSummary);
    return NextResponse.json({ reply, source: "rule_engine" });
  } catch (err: any) {
    console.error("[Copilot API] Error:", err);
    return NextResponse.json(
      { error: "Failed to process AI copilot chat request", details: err.message },
      { status: 500 }
    );
  }
}

// ─── Local Rule Engine for Conversational AI ─────────────────────────────
function generateLocalCopilotReply(query: string, activeBU: any, dbSummary: any): string {
  const q = query.toLowerCase();
  const buName = activeBU ? activeBU.name : "seluruh Business Unit (Konsolidasi Holding)";

  if (q.includes("halo") || q.includes("hi") || q.includes("selamat") || q.includes("pagi") || q.includes("siang") || q.includes("malam")) {
    return `👋 **Halo! Saya AuditSphere AI Risk Copilot.**\n\nSaat ini Anda sedang meninjau konteks **${buName}**.\n\nSaya dapat membantu Anda untuk:\n- 🎯 Menganalisis konsentrasi anomali berisiko tinggi.\n- 🏢 Mengevaluasi cabang/outlet dengan skor risiko terbesar.\n- 👤 Mengidentifikasi nasabah & petugas penaksir yang memerlukan investigasi.\n- 📋 Merumuskan program audit lapangan (Surprise Field Audit / Sidak).\n\nAda aspek risiko tertentu yang ingin kita telusuri?`;
  }

  if (q.includes("sidak") || q.includes("audit mendadak") || q.includes("lapangan") || q.includes("langkah")) {
    return `🚨 **Rekomendasi Program Audit Lapangan (Sidak / Surprise Audit):**\n\nUntuk konteks **${buName}**, berikut panduan taktis yang direkomendasikan:\n\n1. **Verifikasi Fisik Agunan (100% Sampling)**:\n   - Fokus pada barang jaminan berharga tinggi (Emas > 50 gram, BPKB Kendaraan tahun muda).\n   - Cocokkan fisik barang di kankas/brankas dengan nomor akad SPK.\n\n2. **Uji Otentikasi Petugas & Jam Kerja**:\n   - Audit log jam otorisasi sistem (Rule A06/Off-hours).\n   - Verifikasi diskrepansi penaksiran harga jaminan vs harga pasar.\n\n3. **Konfirmasi Langsung Nasabah (Direct CIF Confirmation)**:\n   - Lakukan panggilan terrekam untuk memverifikasi keabsahan pinjaman dan menghindari indikasi *gantung/pending sales*.`;
  }

  if (q.includes("otomotif") || q.includes("o01") || q.includes("o02") || q.includes("o04") || q.includes("o05") || q.includes("leasing") || q.includes("stnk")) {
    return `🚗 **Analisis Risiko Sektor Otomotif:**\n\nBeberapa titik rawan anomali di sektor Otomotif yang terdeteksi:\n\n- **O01 (Pending Sales / Akhir Bulan)**: Penjualan melonjak >50% di 7 hari terakhir bulan. Risiko: manipulasi pencapaian target komisi.\n- **O02 (Monopoli Leasing)**: >60% kredit dikuasai 1 perusahaan leasing. Risiko: indikasi *kickback* oknum sales.\n- **O04 (Ketimpangan Mekanik)**: 1 mekanik menguasai >50% WO bengkel. Risiko: pencatatan fiktif nota servis.\n- **O05 (Diskrepansi STNK)**: Nama konsumen berbeda dengan STNK. Risiko: penipuan identitas / aplikasi fiktif.\n\n💡 **Rekomendasi Audit:** Lakukan sampling stok fisik unit di showroom dan konfirmasi acak ke leasing mitra.`;
  }

  if (q.includes("gadai") || q.includes("a01") || q.includes("a02") || q.includes("a03") || q.includes("a04") || q.includes("ltv") || q.includes("aging")) {
    return `🏦 **Analisis Risiko Sektor Pergadaian:**\n\nAturan anomali kritis yang berlaku:\n\n- **A01 (Frekuensi Tinggi)**: Nasabah gadai >5x dalam 30 hari. Risiko: indikasi penampungan barang / gali lubang tutup lubang.\n- **A02 (Pencairan Besar Aging Singkat)**: Pinjaman >Rp5Juta di-tebus <15 hari. Risiko: pencucian uang atau pinjaman sementara oknum.\n- **A03 & A04 (Top-Up & Lonjakan LTV)**: LTV melonjak dari <70% ke >95% saat Top Up. Risiko: penggelembangan taksiran agunan.\n\n💡 **Rekomendasi Audit:** Uji petik timbang ulang emas (*re-appraisal*) oleh penaksir independen dari Kantor Pusat.`;
  }

  if (q.includes("cabang") || q.includes("outlet") || q.includes("terburuk") || q.includes("kritis")) {
    return `📊 **Evaluasi Risiko Cabang & Unit (${buName}):**\n\nBerdasarkan data terkini di database:\n- Cabang berisiko tinggi umumnya dipicu oleh kombinasi **kepadatan anomali (density > 15%)** dan **supervisory gap petugas (>20)**.\n- Cabang dengan skor risiko ≥ 60 direkomendasikan untuk masuk ke **Daftar Prioritas PKAT (Program Kerja Audit Tahunan)** triwulan ini.\n\nApakah Anda ingin menerbitkan SHA (Surat Hasil Audit) atau memo khusus untuk pimpinan cabang?`;
  }

  if (q.includes("petugas") || q.includes("penaksir") || q.includes("officer") || q.includes("gap")) {
    return `👨‍💼 **Analisis Risiko Petugas / Penaksir:**\n\n- **Supervisory Gap Index** mengukur tingkat ketimpangan antara jumlah transaksi berisiko yang ditangani petugas dengan intensitas pengawasan supervisor.\n- Petugas dengan skor risiko ≥ 80 wajib dievaluasi melalui **Audit Kepatuhan Individu** dan pemeriksaan silang hasil taksiran agunan.`;
  }

  return `🤖 **Tinjauan AI Risk Copilot (${buName}):**\n\nTerima kasih atas pertanyaan Anda mengenai "*${query}*".\n\nSebagai Asisten Senior Audit & Risiko, rekomendasi umum kami:\n1. **Evaluasi Tren Anomali**: Pastikan anomali dengan skor ≥ 80 diprioritaskan untuk klarifikasi 24 jam.\n2. **Integrasi WBS**: Apabila ditemukan indikasi kesengajaan (*fraud intention*), teruskan temuan ke modul WBS Intake.\n3. **Progresif Drill-down**: Gunakan tabel ringkasan Business Unit untuk menelusuri cabang hingga ke rincian kontrak individual.\n\nSilakan tanyakan cabang, nasabah, atau aturan anomali spesifik yang ingin dibahas lebih rinci!`;
}
