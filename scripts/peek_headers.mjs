import xlsx from "xlsx";

function printHeaders(filePath) {
  try {
    console.log(`\n=== Reading ${filePath} ===`);
    const workbook = xlsx.readFile(filePath, { sheetRows: 20 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find the first row that looks like a header (has many non-empty string cells)
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (row && row.length > 5) {
        console.log(`Headers found at row index ${i}:`);
        console.log(row.filter(r => r).join(" | "));
        break;
      }
    }
  } catch (e) {
    console.error("Error reading file:", e.message);
  }
}

printHeaders("C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\Otomotif\\dealer.sale.order.report Jan25-Jun26.xlsx");
printHeaders("C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\Otomotif\\RECAP_Laporan Penjualan Bengkel Jan25-Jun26.xlsx");
