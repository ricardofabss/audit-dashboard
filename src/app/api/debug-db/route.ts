import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reports = await prisma.monthlyReport.findMany();
    const bu = await prisma.granularMonthlyBUReport.findMany();
    
    // Convert BigInt to string before returning
    const safeBuSample = bu.slice(0, 2).map(r => {
      const obj = { ...r };
      obj.aumAktif = r.aumAktif.toString() as any;
      obj.aumAudit = r.aumAudit.toString() as any;
      obj.aumBelumAudit = r.aumBelumAudit.toString() as any;
      return obj;
    });

    return NextResponse.json({ 
      reportsCount: reports.length, 
      reports, 
      buCount: bu.length,
      buSample: safeBuSample
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
