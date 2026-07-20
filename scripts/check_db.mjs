import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const allEvents = await prisma.contractLifecycleEvent.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log("Total events in DB:", await prisma.contractLifecycleEvent.count());
  
  const bUnitCounts = await prisma.contractLifecycleEvent.groupBy({
    by: ['businessUnit'],
    _count: {
      businessUnit: true,
    }
  });
  console.log("Counts by Business Unit:", JSON.stringify(bUnitCounts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
