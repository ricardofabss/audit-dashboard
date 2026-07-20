import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const path = "C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\Otomotif\\dealer.sale.order.report Jan25-Jun26.xlsx";
  console.log("Reading file:", path);
  
  const workbook = xlsx.readFile(path, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (row && row.includes('Nomor SO') && row.includes('Nama STNK')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error("Cannot find 'Nomor SO' and 'Nama STNK' in headers.");
  }

  const headers = data[headerRowIdx];
  const soIndex = headers.indexOf('Nomor SO');
  const stnkIndex = headers.indexOf('Nama STNK');

  const stnkMap = new Map();
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    const so = String(row[soIndex] || '').trim();
    const stnkName = String(row[stnkIndex] || '').trim();
    if (so) {
      stnkMap.set(so, stnkName);
    }
  }

  console.log(`Parsed ${stnkMap.size} unique SO numbers from file.`);
  
  const events = await prisma.contractLifecycleEvent.findMany({
    where: { businessUnit: "bu-ot-ysa", eventType: "BOOKING_NEW" }
  });

  console.log(`Found ${events.length} existing BOOKING_NEW events in database.`);

  let updated = 0;
  for (const event of events) {
    const stnk = stnkMap.get(event.contractNo);
    if (stnk !== undefined) {
      const newMetadata = { ...event.metadata, "Nama STNK": stnk };
      await prisma.contractLifecycleEvent.update({
        where: { id: event.id },
        data: { metadata: newMetadata }
      });
      updated++;
    }
  }

  console.log(`Successfully updated ${updated} records with Nama STNK.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error("Fatal:", e);
});
