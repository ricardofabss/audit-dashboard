import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const branches = [
  "Gadai Mas Nusantara (GMN)",
  "Gadai Mulia Sejahtera (GMS)",
  "Smart Multi Finance (SMF)",
  "Graha Mulia Auto (GMA)",
  "Daihatsu Serba Mulia (DSA)",
  "Sukses Vista Motor (SVM)"
];

const leads = ["Sarah Jenkins", "Michael Chen", "David Kumar", "Elena Rodriguez", "James Wilson", "Budi Santoso"];

async function main() {
  console.log("🌱 Cleaning up existing mock data...");
  await prisma.auditProject.deleteMany();
  await prisma.auditFinding.deleteMany();
  await prisma.wbsCase.deleteMany();
  await prisma.riskRegister.deleteMany();
  await prisma.auditActivity.deleteMany();
  await prisma.monthlyReport.deleteMany();

  console.log("🚀 Seeding new data based on Business Units...");

  // 1. Create Audit Projects & Findings
  for (let i = 0; i < branches.length; i++) {
    const branchName = branches[i];
    const code = branchName.substring(branchName.indexOf("(") + 1, branchName.indexOf(")"));
    
    await prisma.auditProject.create({
      data: {
        auditCode: `AUD-26-${code}-${100 + i}`,
        name: `Q3 Regular Audit - ${branchName}`,
        branch: branchName,
        lead: leads[i],
        status: i % 2 === 0 ? "In Progress" : "Fieldwork",
        progress: 15 + (i * 12),
        risk: i === 0 || i === 2 ? "Critical" : i === 1 ? "High" : "Medium"
      }
    });

    // Create 3 findings per branch
    for (let j = 1; j <= 3; j++) {
      const isCritical = j === 1 && (i === 0 || i === 2);
      await prisma.auditFinding.create({
        data: {
          findingId: `FIN-${code}-26-${j * 10 + i}`,
          title: j === 1 ? `Unauthorized system access in ${code}` : j === 2 ? `Missing collateral documentation at ${code}` : `SLA violation on disbursement (${code})`,
          branch: branchName,
          owner: `BM ${code}`,
          severity: isCritical ? "Critical" : j === 1 ? "High" : "Medium",
          status: j === 1 ? "Open" : "In Progress",
          sla: j === 1 ? "2 Days" : "5 Days",
          progress: j * 20,
          risk: isCritical ? 95 : j === 1 ? 75 : 45
        }
      });
    }
  }

  // 2. Create WBS Cases (Whistleblowing)
  await prisma.wbsCase.create({
    data: {
      caseId: "WBS-812",
      title: "Kickback allegations in SMF procurement",
      category: "Fraud",
      score: 88,
      status: "Investigating",
      reporter: "Anonymous",
      age: "2 Days"
    }
  });
  await prisma.wbsCase.create({
    data: {
      caseId: "WBS-813",
      title: "Fictitious pawn items in GMN",
      category: "Operations",
      score: 95,
      status: "Open",
      reporter: "Internal Whistleblower",
      age: "1 Day"
    }
  });
  await prisma.wbsCase.create({
    data: {
      caseId: "WBS-814",
      title: "Manipulated sales targets in GMA",
      category: "Sales Fraud",
      score: 72,
      status: "Confirmed",
      reporter: "Anonymous",
      age: "5 Days"
    }
  });

  // 3. Create Recent Activities
  await prisma.auditActivity.createMany({
    data: [
      { title: "Finding Escalated", detail: "FIN-GMN-26-10 escalated to CAE", time: "10 mins ago", tone: "red" },
      { title: "Audit Fieldwork Started", detail: "Q3 Regular Audit - SMF", time: "1 hour ago", tone: "cyan" },
      { title: "WBS Case Opened", detail: "WBS-813 filed for GMN", time: "3 hours ago", tone: "amber" },
      { title: "Remediation Approved", detail: "Branch Manager GMA approved plan", time: "1 day ago", tone: "emerald" },
      { title: "Risk Assessment Updated", detail: "DSA branch risk level downgraded", time: "2 days ago", tone: "indigo" }
    ]
  });

  // 4. Create Monthly Reports
  const currentMonth = "2026-06";
  for (let i = 0; i < branches.length; i++) {
    const branchName = branches[i];
    const code = branchName.substring(branchName.indexOf("(") + 1, branchName.indexOf(")"));
    
    // Some submitted, some pending, some overdue
    const status = i === 0 || i === 2 ? "Submitted" : i === 1 ? "In Review" : "Pending";
    
    await prisma.monthlyReport.create({
      data: {
        reportMonth: currentMonth,
        buCode: `PG-${code}`, // using mock codes like PG-GMN
        status: status,
        submitter: status === "Pending" ? null : leads[i],
        submittedAt: status === "Pending" ? null : new Date(Date.now() - Math.random() * 86400000 * 3),
      }
    });
  }

  console.log("✅ Seeding complete! Database is now populated with real Business Unit contexts.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
