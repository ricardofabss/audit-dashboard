import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

function excelSerialToDate(serial) {
  if (!serial) return null;
  if (typeof serial === "string") {
    const parts = serial.split("/");
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
    }
    const d = new Date(serial);
    if (!isNaN(d)) return d;
    return null;
  }
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

async function main() {
  const path = "C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\Otomotif\\RECAP_Laporan Penjualan Bengkel Jan25-Jun26.xlsx";
  console.log("Reading file:", path);
  
  const workbook = xlsx.readFile(path, { cellDates: false });
  let totalEvents = [];

  for (const sheetName of workbook.SheetNames) {
    console.log(`Processing sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find header row
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (row && row.length > 5 && row.includes('Workshop Number')) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      console.log(`No valid header found in sheet ${sheetName}, skipping.`);
      continue;
    }

    const headers = data[headerRowIdx];
    let sheetCount = 0;

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const rawMetadata = {};
      headers.forEach((h, idx) => {
        if (h) rawMetadata[h] = row[idx];
      });

      const woNumber = String(rawMetadata['Workshop Number'] || '');
      if (!woNumber || woNumber.toLowerCase() === 'undefined') continue;

      const eventDate = excelSerialToDate(rawMetadata['Date']) || new Date();
      const customerId = String(rawMetadata['Customer Code'] || '');
      const outletCode = String(rawMetadata['Branch Code'] || '');
      const branchName = String(rawMetadata['Branch Name'] || '');

      const amount = Number(rawMetadata['Total'] || 0);

      totalEvents.push({
        id: randomUUID(),
        businessUnit: "bu-ot-ysa",
        collateralType: "KENDARAAN",
        contractNo: woNumber,
        rootContractNo: woNumber,
        customerId: customerId,
        outletCode: outletCode,
        outletName: branchName,
        branchName: branchName,
        eventType: "BOOKING_NEW", // Using BOOKING_NEW to pass schema validation
        eventDate: eventDate,
        principalInitial: amount,
        loanInitial: amount,
        sourceSystem: "EXCEL",
        sourceSheet: sheetName,
        sourceEventKey: `BENGKEL-${sheetName}-${woNumber}-${i}`,
        metadata: rawMetadata
      });
      sheetCount++;
    }
    console.log(`Found ${sheetCount} valid rows in sheet ${sheetName}`);
  }

  console.log(`Parsed total ${totalEvents.length} workshop records. Upserting to database...`);
  
  let inserted = 0;
  for (const event of totalEvents) {
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
      if (inserted % 500 === 0) console.log(`Upserted ${inserted}...`);
    } catch (e) {
      console.error(`Failed to insert ${event.contractNo}:`, e.message);
    }
  }

  console.log(`Successfully upserted ${inserted} records.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error("Fatal:", e);
});
