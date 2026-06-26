import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Clearing Old Imported Data ===");
  
  // Clear the ETL-related tables
  const deletedEvents = await prisma.contractLifecycleEvent.deleteMany({});
  const deletedCurrent = await prisma.contractLifecycleCurrent.deleteMany({});
  const deletedSnapshots = await prisma.branchWeeklySnapshot.deleteMany({});

  console.log(`Cleared:`);
  console.log(`- ${deletedEvents.count} rows from ContractLifecycleEvent`);
  console.log(`- ${deletedCurrent.count} rows from ContractLifecycleCurrent`);
  console.log(`- ${deletedSnapshots.count} rows from BranchWeeklySnapshot`);
  console.log("\nDatabase is now clean and ready for import!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
