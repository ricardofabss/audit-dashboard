import xlsx from "xlsx";
import path from "path";
import fs from "fs";

const filePath = "C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\data granular monthly BU.xlsx";

try {
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

  const periodMap = {};

  for (const row of data) {
    const bu = String(row["Bisnis Unit"] || "").toLowerCase();
    if (bu.includes("pajak")) {
      const rawPeriode = row["Periode"];
      if (!periodMap[rawPeriode]) periodMap[rawPeriode] = { totalNoa: 0, maxAuditor: 0 };
      
      const noaEmas = Number(row["Noa Audit Bulan Berjalan (Emas)"]) || 0;
      const noaElektronik = Number(row["Noa Audit Bulan Berjalan (Elektronik)"]) || 0;
      const noaBulanBerjalan = noaEmas + noaElektronik;
      const auditor = Number(row["Jumlah Auditor Lapangan"]) || 0;
      
      periodMap[rawPeriode].totalNoa += noaBulanBerjalan;
      periodMap[rawPeriode].maxAuditor = Math.max(periodMap[rawPeriode].maxAuditor, auditor);
    }
  }

  console.log("=== Analisis Data Pajak Mas ===");
  for (const p of Object.keys(periodMap)) {
    console.log(`\nPeriode: ${p}`);
    console.log(`Total NOA Audit Bulan Berjalan (Emas + Elektronik) = ${periodMap[p].totalNoa}`);
    console.log(`Jumlah Auditor Lapangan (Max) = ${periodMap[p].maxAuditor}`);
    const productivity = periodMap[p].maxAuditor > 0 ? (periodMap[p].totalNoa / periodMap[p].maxAuditor) : 0;
    console.log(`Produktivitas = ${productivity}`);
  }

} catch (err) {
  console.error("Error:", err);
}
