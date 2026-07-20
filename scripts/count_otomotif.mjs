import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function count() {
  const c = await prisma.contractLifecycleEvent.count({ where: { businessUnit: "OTOMOTIF" } });
  console.log("Count:", c);
  await prisma.$disconnect();
}
count();
