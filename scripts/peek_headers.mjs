// Peek at Excel headers using ExcelJS (streaming, fast for large files)
import ExcelJS from 'exceljs';
import path from 'path';

const dataDir = 'C:/Users/USER/OneDrive/Desktop/Kaizen/Sample data/Gadai MAS';

for (const filename of ['Booking.xlsx', 'Pelunasan.xlsx']) {
  const fullPath = path.join(dataDir, filename);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FILE: ${filename}`);
  console.log(`${'='.repeat(60)}`);
  
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(fullPath);
    
    workbook.eachSheet((worksheet, sheetId) => {
      console.log(`\n  Sheet: '${worksheet.name}' (rows: ${worksheet.rowCount})`);
      
      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers.push({ col: colNumber, name: cell.value });
        console.log(`    [${colNumber}] ${cell.value}`);
      });
      
      // Sample row
      if (worksheet.rowCount >= 2) {
        const sampleRow = worksheet.getRow(2);
        console.log(`  Sample data row:`);
        headers.forEach(h => {
          const val = sampleRow.getCell(h.col).value;
          if (val !== null && val !== undefined) {
            console.log(`    ${h.name} = ${val}`);
          }
        });
      }
    });
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

console.log('\nDone!');
