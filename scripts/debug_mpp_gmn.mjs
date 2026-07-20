import xlsx from "xlsx";
import path from "path";
import fs from "fs";

const filePath = "C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\data granular monthly BU.xlsx";

try {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

  let latestPeriod = 0;
  for (const row of data) {
    const bu = String(row["Bisnis Unit"] || "").toLowerCase();
    if (bu.includes("mulia")) continue; // skip GMS
    if (bu.includes("gmn") || bu.includes("nusantara")) {
      const p = Number(row["Periode"]);
      if (p > latestPeriod) latestPeriod = p;
    }
  }

  console.log("=== Debug MPP GMN ===");
  console.log("Latest Period GMN:", latestPeriod);
  
  let mppAuditor = 0;
  let mpp2026 = 0;
  let auditor = 0;
  let count = 0;

  for (const row of data) {
    const bu = String(row["Bisnis Unit"] || "").toLowerCase();
    if (bu.includes("mulia")) continue; // skip GMS
    if (bu.includes("gmn") || bu.includes("nusantara")) {
      const p = Number(row["Periode"]);
      if (p === latestPeriod) {
        count++;
        const valMPP = Number(row["MPP Auditor Lapangan"]);
        const valMPP26 = Number(row["MPP 2026"]);
        const valAuditor = Number(row["Jumlah Auditor Lapangan"]);
        
        mppAuditor = Math.max(mppAuditor, valMPP || 0);
        mpp2026 = Math.max(mpp2026, valMPP26 || 0);
        auditor = Math.max(auditor, valAuditor || 0);
      }
    }
  }

  console.log("Rows in latest period:", count);
  console.log("Max MPP Auditor Lapangan:", mppAuditor);
  console.log("Max MPP 2026:", mpp2026);
  console.log("Max Jumlah Auditor Lapangan:", auditor);
  
} catch (err) {
  console.error("Error:", err);
}
