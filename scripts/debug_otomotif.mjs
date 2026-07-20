import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Get 20 records from bu-ot-ysa
  const events = await prisma.contractLifecycleEvent.findMany({
    where: { businessUnit: 'bu-ot-ysa', deletedAt: null },
    take: 20,
    orderBy: { eventDate: 'desc' }
  });
  
  console.log(`Total events fetched: ${events.length}`);
  
  // Group by salesman
  const salesmen = {};
  for (const e of events) {
    const meta = e.metadata;
    const salesman = meta?.Salesforce;
    const eventDate = e.eventDate?.toISOString().split('T')[0];
    const cashCredit = meta?.['Cash / Credit'];
    const customerName = meta?.['Customer Name'];
    const stnkName = meta?.['Nama STNK'];
    
    console.log(`  contractNo=${e.contractNo}, salesman=${salesman}, eventDate=${eventDate}, cashCredit=${cashCredit}, customerName=${customerName}, stnkName=${stnkName}`);
    
    if (salesman) {
      salesmen[salesman] = (salesmen[salesman] || 0) + 1;
    }
  }
  
  console.log('\nSalesmen counts from 20 records:', JSON.stringify(salesmen));
  
  // Now count salesmen with >= 5 transactions across all data
  const allEvents = await prisma.contractLifecycleEvent.findMany({
    where: { businessUnit: 'bu-ot-ysa', deletedAt: null },
    select: { metadata: true, eventDate: true }
  });
  
  console.log(`\nTotal bu-ot-ysa events: ${allEvents.length}`);
  
  const allSalesmen = {};
  for (const e of allEvents) {
    const salesman = e.metadata?.Salesforce;
    if (salesman) {
      allSalesmen[salesman] = (allSalesmen[salesman] || 0) + 1;
    }
  }
  
  const hotSalesmen = Object.entries(allSalesmen).filter(([_, count]) => count >= 5);
  console.log(`Salesmen with >= 5 transactions: ${hotSalesmen.length}`);
  console.log(`Top 10 salesmen:`, hotSalesmen.sort((a, b) => b[1] - a[1]).slice(0, 10));
  
  // Check date distribution
  const months = {};
  for (const e of allEvents) {
    const dateStr = e.eventDate?.toISOString().substring(0, 7);
    if (dateStr) {
      months[dateStr] = (months[dateStr] || 0) + 1;
    }
  }
  console.log(`\nDate distribution:`, JSON.stringify(months));
}

main().catch(console.error).finally(() => prisma.$disconnect());
