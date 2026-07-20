import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

function excelSerialToDate(serial) {
  if (!serial) return null;
  if (typeof serial === "string") {
    // maybe already "02/01/2025"
    const parts = serial.split("/");
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
    }
    return new Date(serial);
  }
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

async function main() {
  const path = "C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\Otomotif\\Laporan Penjualan Jan25-Jun26.xls";
  console.log("Reading file:", path);
  
  const workbook = xlsx.readFile(path, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Data starts at row 6 (index 5) and header is row 5 (index 4)
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  const headers = data[4];
  
  if (!headers || !headers.includes('SO Number')) {
    throw new Error("Cannot find header row at index 4");
  }

  const events = [];

  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[4]) continue; // SO Number is missing
    
    // Create an object mapping headers to row values
    const rawMetadata = {};
    headers.forEach((h, idx) => {
      if (h) rawMetadata[h] = row[idx];
    });

    const contractNo = String(rawMetadata['SO Number'] || '');
    if (!contractNo) continue;

    const soDate = excelSerialToDate(rawMetadata['SO Date']);
    
    events.push({
      id: randomUUID(),
      businessUnit: "OTOMOTIF",
      collateralType: "ELEKTRONIK", // using ELEKTRONIK as fallback
      contractNo,
      rootContractNo: contractNo,
      customerId: String(rawMetadata['Customer Code'] || ''),
      outletCode: String(rawMetadata['Branch Code'] || ''),
      outletName: String(rawMetadata['Branch Name'] || ''),
      branchName: String(rawMetadata['Branch Name'] || ''),
      eventType: "BOOKING_NEW",
      eventDate: soDate || new Date(),
      principalInitial: Number(rawMetadata['Total Piutang Penjualan'] || rawMetadata['Harga Jual Bersih (+PPN)'] || 0),
      loanInitial: Number(rawMetadata['Piutang Pelunasan'] || 0),
      sourceSystem: "EXCEL",
      sourceSheet: "LAPORAN PENJUALAN",
      sourceEventKey: `OTOMOTIF-${contractNo}-${i}`,
      metadata: rawMetadata
    });
  }

  console.log(`Parsed ${events.length} records. Upserting to database...`);
  
  let inserted = 0;
  for (const event of events) {
    try {
      await prisma.contractLifecycleEvent.upsert({
        where: { sourceEventKey: event.sourceEventKey },
        update: {
          metadata: event.metadata,
          principalInitial: event.principalInitial,
        },
        create: event
      });
      inserted++;
    } catch (e) {
      console.error(`Failed to insert ${event.contractNo}:`, e.message);
    }
  }

  console.log(`Successfully upserted ${inserted} records.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
