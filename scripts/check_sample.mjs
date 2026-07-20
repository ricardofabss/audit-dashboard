import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.contractLifecycleEvent.findMany({
    where: { businessUnit: 'bu-ot-ysa' },
    take: 3,
    orderBy: { eventDate: 'desc' }
  });
  console.log(JSON.stringify(events, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
