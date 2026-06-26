import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const audits = await prisma.auditProject.findMany();
    console.log("Successfully connected! Audits:", audits);
  } catch (error) {
    console.error("Database connection or schema error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
