import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function check() {
  const row = await prisma.contractLifecycleEvent.findFirst({ where: { businessUnit: "bu-ot-ysa" } });
  if (row) {
    console.log("Metadata keys:", Object.keys(row.metadata));
    console.log("Sample metadata:", JSON.stringify(row.metadata, null, 2));
  }
  await prisma.$disconnect();
}
check();
