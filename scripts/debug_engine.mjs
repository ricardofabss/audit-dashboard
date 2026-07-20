import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const dbEvents = await prisma.contractLifecycleEvent.findMany({
    where: { businessUnit: 'bu-ot-ysa', deletedAt: null },
    orderBy: [{ eventDate: 'desc' }],
    take: 20000,
  });
  
  console.log(`Fetched ${dbEvents.length} events`);
  
  // Simulate the same mapping as route.ts
  const transactions = dbEvents.map(e => {
    const loanAmt = e.loanInitial ? Number(e.loanInitial) : (e.principalInitial ? Number(e.principalInitial) : 0);
    return {
      contractNo: e.contractNo,
      rootContractNo: e.rootContractNo,
      customerId: e.customerId || 'UNKNOWN',
      customerName: e.metadata?.['Customer Name'] || 'Unknown',
      outletCode: e.outletCode,
      outletName: e.outletName || `Outlet ${e.outletCode}`,
      branchName: e.branchName || `Cabang ${e.outletCode}`,
      officerId: 'OFF-DEFAULT',
      officerName: 'Petugas',
      eventType: e.eventType,
      eventDate: e.eventDate.toISOString().split('T')[0],
      eventTime: '10:00',
      loanAmount: loanAmt,
      ltvRatio: 0,
      agingDays: 0,
      renewalCount: 0,
      rawMetadata: e.metadata || undefined,
    };
  });
  
  console.log(`Mapped ${transactions.length} transactions`);
  console.log(`Sample rawMetadata keys:`, transactions[0]?.rawMetadata ? Object.keys(transactions[0].rawMetadata).slice(0, 5) : 'NONE');
  console.log(`Sample Salesforce:`, transactions[0]?.rawMetadata?.['Salesforce']);
  
  // Manually run O01 logic
  const byMonthSalesman = new Map();
  
  for (const tx of transactions) {
    const salesman = tx.rawMetadata?.['Salesforce'];
    if (!salesman) continue;
    
    const dateStr = tx.eventDate;
    if (!dateStr || dateStr.length < 10) continue;
    
    const monthStr = dateStr.substring(0, 7);
    const key = `${monthStr}_${salesman}`;
    
    if (!byMonthSalesman.has(key)) {
      byMonthSalesman.set(key, { total: 0, spike: 0, salesman, monthStr });
    }
    
    const group = byMonthSalesman.get(key);
    group.total++;
    
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(5, 7));
    const day = parseInt(dateStr.substring(8, 10));
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    
    if (day > lastDayOfMonth - 7) {
      group.spike++;
    }
  }
  
  console.log(`\nO01: ${byMonthSalesman.size} month-salesman groups`);
  
  let o01Count = 0;
  for (const group of byMonthSalesman.values()) {
    if (group.total >= 5) {
      const spikeRatio = group.spike / group.total;
      if (spikeRatio > 0.5) {
        o01Count++;
        if (o01Count <= 5) {
          console.log(`  O01 HIT: ${group.salesman}, ${group.monthStr}: ${group.spike}/${group.total} = ${(spikeRatio*100).toFixed(1)}%`);
        }
      }
    }
  }
  console.log(`Total O01 triggers: ${o01Count}`);
  
  // Manually run O02 logic
  const salesmanLeasing = new Map();
  
  for (const tx of transactions) {
    const salesman = tx.rawMetadata?.['Salesforce'];
    const cashOrCredit = tx.rawMetadata?.['Cash / Credit'] || '';
    
    if (!salesman || !cashOrCredit || cashOrCredit.toLowerCase() === 'cash') continue;
    
    if (!salesmanLeasing.has(salesman)) {
      salesmanLeasing.set(salesman, { totalCredit: 0, leasingCounts: {} });
    }
    
    const group = salesmanLeasing.get(salesman);
    group.totalCredit++;
    group.leasingCounts[cashOrCredit] = (group.leasingCounts[cashOrCredit] || 0) + 1;
  }
  
  let o02Count = 0;
  for (const [salesman, group] of salesmanLeasing.entries()) {
    if (group.totalCredit >= 5) {
      let maxLeasing = '';
      let maxCount = 0;
      for (const [leasing, count] of Object.entries(group.leasingCounts)) {
        if (count > maxCount) {
          maxCount = count;
          maxLeasing = leasing;
        }
      }
      const dominanceRatio = maxCount / group.totalCredit;
      if (dominanceRatio > 0.6) {
        o02Count++;
        if (o02Count <= 5) {
          console.log(`  O02 HIT: ${salesman}, ${maxLeasing}: ${maxCount}/${group.totalCredit} = ${(dominanceRatio*100).toFixed(1)}%`);
        }
      }
    }
  }
  console.log(`Total O02 triggers: ${o02Count}`);
  
  // Manually run O05 logic
  const bySalesman = new Map();
  for (const tx of transactions) {
    const customerName = tx.rawMetadata?.['Customer Name'];
    const stnkName = tx.rawMetadata?.['Nama STNK'];
    const salesman = tx.rawMetadata?.['Salesforce'];
    
    if (salesman && customerName && stnkName) {
      const name1 = customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const name2 = stnkName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (name1 !== name2 && name1.length > 0 && name2.length > 0) {
        bySalesman.set(salesman, (bySalesman.get(salesman) || 0) + 1);
      }
    }
  }
  
  let o05Count = 0;
  for (const [salesman, count] of bySalesman.entries()) {
    if (count >= 3) {
      o05Count++;
      if (o05Count <= 5) {
        console.log(`  O05 HIT: ${salesman}, mismatches: ${count}`);
      }
    }
  }
  console.log(`Total O05 triggers: ${o05Count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
