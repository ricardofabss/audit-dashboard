import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function check() {
  const count = await prisma.contractLifecycleEvent.count({ where: { eventType: "WORKSHOP" } });
  console.log("Workshop records:", count);
  await prisma.$disconnect();
}
check();
