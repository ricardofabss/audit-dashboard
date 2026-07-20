import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Update OTOMOTIF to bu-ot-ysa
  const otomotifRes = await prisma.contractLifecycleEvent.updateMany({
    where: { businessUnit: "OTOMOTIF" },
    data: { businessUnit: "bu-ot-ysa" }
  });
  console.log("Updated Otomotif rows:", otomotifRes.count);

  // Update GADAI_MAS to bu-pg-gmn
  const gadaiRes = await prisma.contractLifecycleEvent.updateMany({
    where: { businessUnit: "GADAI_MAS" },
    data: { businessUnit: "bu-pg-gmn" }
  });
  console.log("Updated Gadai rows:", gadaiRes.count);

  await prisma.$disconnect();
}

main().catch(console.error);
