import fs from 'fs';
import xlsx from 'xlsx';

try {
  const filePath = 'C:/Users/USER/OneDrive/Desktop/Kaizen/Sample data/Data Granular Monthly BU.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

  const result = {
    totalRows: data.length,
    columns: data.length > 0 ? Object.keys(data[0]) : [],
    sample: data.slice(0, 3)
  };

  fs.writeFileSync('C:/Users/USER/OneDrive/Desktop/Kaizen/Ruang kerja audit/scripts/excel_output.json', JSON.stringify(result, null, 2));
  console.log('Berhasil membaca Excel dan menyimpannya ke scripts/excel_output.json');
} catch (error) {
  console.error('Error reading Excel:', error);
}
