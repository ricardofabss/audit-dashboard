import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Checking Imported Database Data ===");

  const eventCount = await prisma.contractLifecycleEvent.count();
  const currentCount = await prisma.contractLifecycleCurrent.count();
  const snapshotCount = await prisma.branchWeeklySnapshot.count();

  console.log(`Total ContractLifecycleEvent: ${eventCount}`);
  console.log(`Total ContractLifecycleCurrent: ${currentCount}`);
  console.log(`Total BranchWeeklySnapshot: ${snapshotCount}`);

  if (eventCount > 0) {
    const dateRange = await prisma.contractLifecycleEvent.aggregate({
      _min: { eventDate: true },
      _max: { eventDate: true }
    });
    console.log(`Event Date Range in DB: ${dateRange._min.eventDate?.toISOString().slice(0, 10)} to ${dateRange._max.eventDate?.toISOString().slice(0, 10)}`);
  }

  if (snapshotCount > 0) {
    console.log("\nBranch Weekly Snapshot Counts (top 15):");
    const snapshots = await prisma.branchWeeklySnapshot.groupBy({
      by: ['periodYear', 'periodMonth', 'weekIndex'],
      _count: { id: true },
      _sum: { bookingEventCount: true, settlementCount: true },
      orderBy: [
        { periodYear: 'asc' },
        { periodMonth: 'asc' },
        { weekIndex: 'asc' }
      ],
      take: 15
    });

    for (const snap of snapshots) {
      console.log(`Year: ${snap.periodYear}, Month: ${snap.periodMonth}, Week: ${snap.weekIndex} -> ${snap._count.id} branch entries, Booking Events: ${snap._sum.bookingEventCount}, Settlements: ${snap._sum.settlementCount}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
