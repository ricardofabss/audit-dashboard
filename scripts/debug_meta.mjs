import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const e = await prisma.contractLifecycleEvent.findFirst({
    where: { businessUnit: 'bu-ot-ysa', deletedAt: null },
  });
  
  console.log('typeof e.metadata:', typeof e.metadata);
  console.log('e.metadata constructor:', e.metadata?.constructor?.name);
  console.log('JSON.stringify e.metadata (first 500):', JSON.stringify(e.metadata).substring(0, 500));
  
  // Test access patterns
  const meta = e.metadata;
  console.log('\nmeta?.Salesforce:', meta?.Salesforce);
  console.log("meta?.['Salesforce']:", meta?.['Salesforce']);
  console.log("meta?.['Cash / Credit']:", meta?.['Cash / Credit']);
  console.log("meta?.['Customer Name']:", meta?.['Customer Name']);
  console.log("meta?.['Nama STNK']:", meta?.['Nama STNK']);
  
  // Simulate what the route does
  const rawMetadata = meta || undefined;
  console.log('\nrawMetadata?.Salesforce:', rawMetadata?.Salesforce);
  console.log("rawMetadata?.['Salesforce']:", rawMetadata?.['Salesforce']);
}

main().catch(console.error).finally(() => prisma.$disconnect());
