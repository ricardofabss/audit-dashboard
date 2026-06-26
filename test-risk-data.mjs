import { PrismaClient } from "@prisma/client";
import { runAnomalyDetection } from "./src/lib/engines/anomaly-engine.js";
import { getRiskData } from "./src/lib/risk-mock-data.js";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Testing Database Connection & Anomaly Engine ===");
  
  // 1. Get active rules
  const mockDataSet = getRiskData(null);
  const rules = mockDataSet.anomalyRules;
  console.log(`Loaded ${rules.length} anomaly rules.`);

  // 2. Fetch events from database
  console.log("Fetching events from database...");
  const dbEvents = await prisma.contractLifecycleEvent.findMany({
    where: { deletedAt: null },
    take: 2000,
  });
  console.log(`Fetched ${dbEvents.length} events from database.`);

  if (dbEvents.length === 0) {
    console.log("Database has 0 events. Please import data first.");
    return;
  }

  // 3. Map to TransactionInput
  console.log("Mapping events to transaction inputs...");
  const transactions = dbEvents.map(e => {
    const loanAmt = e.loanInitial ? Number(e.loanInitial) : (e.principalInitial ? Number(e.principalInitial) : 0);
    return {
      contractNo: e.contractNo,
      rootContractNo: e.rootContractNo,
      customerId: e.customerId || `CIF-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName: e.customerId ? `Nasabah ${e.customerId.replace("CIF-", "")}` : "Nasabah Walk-in",
      outletCode: e.outletCode,
      outletName: e.outletName || `Outlet ${e.outletCode}`,
      branchName: e.branchName || `Cabang ${e.outletCode}`,
      officerId: "OFF-DEFAULT",
      officerName: "Petugas Penilai",
      eventType: e.eventType,
      eventDate: e.eventDate.toISOString().split("T")[0],
      eventTime: e.eventTs ? e.eventTs.toISOString().split("T")[1].substring(0, 5) : "10:00",
      loanAmount: loanAmt,
      ltvRatio: e.ltvRatio ? Number(e.ltvRatio) : 0,
      agingDays: e.overdueDays || 0,
      renewalCount: e.renewalCount || 0,
      disbursementDate: e.disbursementDate ? e.disbursementDate.toISOString().split("T")[0] : undefined,
      settlementDate: e.settlementDate ? e.settlementDate.toISOString().split("T")[0] : undefined,
    };
  });

  // 4. Run anomaly engine
  console.log("Running anomaly detection...");
  const detections = runAnomalyDetection(transactions, rules);
  console.log(`Detected ${detections.length} total anomalies in database transactions.`);

  // 5. Print a sample of detections
  if (detections.length > 0) {
    console.log("\nSample of detected anomalies:");
    detections.slice(0, 5).forEach((d, idx) => {
      console.log(`[${idx + 1}] Rule: ${d.ruleCode} (${d.ruleName}) - Entity: ${d.entityName} - Score: ${d.riskScore}`);
      console.log(`    Details: ${d.description}`);
    });
  }

  // 6. Print summary statistics
  const customerDetections = detections.filter(d => d.entityType === "CUSTOMER");
  const uniqueCustomers = new Set(customerDetections.map(d => d.entityId));
  console.log(`\nSummary Statistics:`);
  console.log(`- Unique high-risk customers: ${uniqueCustomers.size}`);
  console.log(`- Unique monitored outlets: ${new Set(transactions.map(t => t.outletCode)).size}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
