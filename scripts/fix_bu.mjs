import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.contractLifecycleEvent.updateMany({
    where: {
      businessUnit: "OTOMOTIF"
    },
    data: {
      businessUnit: "bu-ot-ysa"
    }
  });
  console.log(`Updated ${result.count} records to bu-ot-ysa`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
