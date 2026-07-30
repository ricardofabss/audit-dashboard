const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const result = await db.contractLifecycleEvent.findMany({
    distinct: ['businessUnit'],
    select: { businessUnit: true },
    take: 20
  });
  console.log("Distinct businessUnit values:", JSON.stringify(result));
  
  // Also count per BU
  for (const r of result) {
    const count = await db.contractLifecycleEvent.count({
      where: { businessUnit: r.businessUnit, deletedAt: null }
    });
    console.log(`  ${r.businessUnit}: ${count} events`);
  }
  
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
