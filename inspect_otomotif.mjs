import xlsx from "xlsx";
import fs from "fs";

try {
  const path = "C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\Otomotif\\Laporan Penjualan Jan25-Jun26.xls";
  const workbook = xlsx.readFile(path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  for(let i=3; i<15; i++) {
    console.log(`Row ${i}:`, data[i]);
  }
} catch (e) {
  console.error("Error:", e.message);
}
