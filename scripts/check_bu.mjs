import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function check() {
  const g = await prisma.contractLifecycleEvent.findMany({ select: { businessUnit: true }, distinct: ['businessUnit'] });
  console.log("Distinct BUs:", g);
  await prisma.$disconnect();
}
check();
