import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { csvText } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set in .env.local" },
        { status: 400 }
      );
    }

    if (!csvText || csvText.trim() === "") {
      return NextResponse.json(
        { error: "Empty document provided" },
        { status: 400 }
      );
    }

    const prompt = `Anda adalah seorang Auditor Senior berbasis AI.
Tugas Anda adalah mengekstrak daftar Temuan Pemeriksaan (Audit Findings) dari teks kasar berformat CSV yang berasal dari file Excel.
Teks ini mungkin berantakan, berisi kop surat, sel yang digabung (merged cells), atau baris kosong. 
Abaikan semua kop surat dan informasi yang tidak relevan. Fokus HANYA pada tabel atau daftar temuan.

Aturan Output:
Hasilkan HANYA output berformat JSON murni (array of objects) tanpa tambahan teks markdown atau backticks (\`\`\`).
Setiap objek harus memiliki kunci persis seperti ini:
- "title": (string) Judul Singkat temuan (General language, maksimal 5-7 kata). Contoh: "Selisih Kas Fisik" atau "Dokumen Vendor Tidak Lengkap".
- "description": (string) Uraian Temuan Lengkap. Salin isi teks asli dari file Excel, NAMUN Anda HARUS merapikan format tampilannya (gunakan baris baru "\n", poin-poin/bullet numbering, dan pemisah paragraf) agar kalimatnya mudah dibaca. Jangan mengubah makna atau menghilangkan data penting, hanya perbaiki tata letaknya.
- "category": (string) Pilih salah satu kategori standar audit: "Kepatuhan", "Operasional", "Keuangan", atau "Lainnya".
- "severity": (string) Analisis konteks temuannya secara logis. Pilih tingkat keparahan yang masuk akal: "Critical", "High", "Medium", atau "Low".
- "owner": (string) Nama divisi, peran, atau jabatan yang bertanggung jawab (misal: "Branch Manager", "Head Teller"). Jangan sebut nama orang.

Teks Kasar Excel:
${csvText}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API Error:", data.error);
      
      // Coba fetch daftar model untuk debugging
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const listData = await listRes.json();
        const availableModels = listData.models?.map((m: any) => m.name).join(", ");
        return NextResponse.json({ 
          error: data.error.message + " | Available Models: " + (availableModels || "None") 
        }, { status: 500 });
      } catch (e) {
        return NextResponse.json({ error: data.error.message }, { status: 500 });
      }
    }

    let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!jsonString) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Bersihkan backticks markdown jika AI masih membandel
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

    const findings = JSON.parse(jsonString);

    return NextResponse.json({ findings });
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
