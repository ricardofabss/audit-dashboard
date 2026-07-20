import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: Save granular BU report data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Invalid data format or empty data" }, { status: 400 });
    }

    // Since this is a dashboard update, we can either clear old data for the same period or just clear all
    // For simplicity in this demo, let's clear the entire table before inserting new data
    // to act as a "sync" operation for the dashboard.
    await db.granularMonthlyBUReport.deleteMany({});

    // Map JSON rows to Prisma schema
    const rowsToInsert = data.map((row: any) => ({
      bisnisUnit: String(row["Bisnis Unit"] || ""),
      periode: String(row["Periode"] || ""),
      cabangArea: String(row["Cabang/Area"] || ""),
      noaAktif: Number(row[" Noa aktif "]) || 0,
      noaAudit: Number(row[" Noa Audit "]) || 0,
      noaBelumAudit: Number(row[" Noa Belum Audit "]) || 0,
      pctNoaAudit: Number(row["% Noa Audit"]) || 0,
      aumAktif: BigInt(Math.round(Number(row["Aum Aktif"]) || 0)),
      aumAudit: BigInt(Math.round(Number(row["Aum Audit"]) || 0)),
      aumBelumAudit: BigInt(Math.round(Number(row["Aum Belum Audit"]) || 0)),
      pctAumAudit: Number(row["% Aum Audit"]) || 0,
      auditorLapangan: Number(row["Jumlah Auditor Lapangan"]) || 0,
      mpp2026: Number(row["MPP 2026"]) || 0,
      mppAuditorLapangan: Number(row["MPP Auditor Lapangan"]) || 0,
      noaAuditBulanBerjalan: (Number(row["Noa Audit Bulan Berjalan (Emas)"]) || 0) + (Number(row["Noa Audit Bulan Berjalan (Elektronik)"]) || 0),
      noaProductivityBulan: Number(row["NoA Productivity/Bulan"]) || 0,
      rawData: row,
    }));

    await db.granularMonthlyBUReport.createMany({
      data: rowsToInsert,
    });

    // Extract unique Report Month & BU combinations to register in MonthlyReport table
    const uniqueReports = new Map<string, { reportMonth: string, buCode: string }>();

    rowsToInsert.forEach(row => {
      let buCode = "UNKNOWN";
      const buLower = row.bisnisUnit.toLowerCase();
      if (buLower.includes("gmn") || buLower.includes("nusantara")) buCode = "PG-GMN";
      else if (buLower.includes("mulia") || buLower.includes("gms")) buCode = "PG-GMS";
      else if (buLower.includes("pajak")) buCode = "Pajak Mas";

      const parsedNum = Number(row.periode);
      let reportMonth = "Unknown";
      if (!isNaN(parsedNum) && parsedNum > 40000) {
        const d = new Date(Math.round((parsedNum - 25569) * 86400 * 1000));
        const month = String(d.getMonth() + 1).padStart(2, '0');
        reportMonth = `${d.getFullYear()}-${month}`;
      }
      
      const key = `${reportMonth}_${buCode}`;
      if (!uniqueReports.has(key)) {
        uniqueReports.set(key, { reportMonth, buCode });
      }
    });

    // Upsert into MonthlyReport
    for (const report of uniqueReports.values()) {
      if (report.reportMonth === "Unknown" || report.buCode === "UNKNOWN") continue;
      
      await db.monthlyReport.upsert({
        where: {
          reportMonth_buCode: {
            reportMonth: report.reportMonth,
            buCode: report.buCode,
          }
        },
        update: {
          status: "Submitted",
          submittedAt: new Date(),
        },
        create: {
          reportMonth: report.reportMonth,
          buCode: report.buCode,
          status: "Submitted",
          submitter: "System Auto-Sync",
          submittedAt: new Date(),
        }
      });
    }

    return NextResponse.json({ success: true, count: rowsToInsert.length }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving granular report:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Retrieve the stored granular data for the dashboard
export async function GET() {
  try {
    const reports = await db.granularMonthlyBUReport.findMany();
    
    // We need to serialize BigInt for JSON response
    const serialized = reports.map((r: any) => {
      // Merge rawData back into the top level object so the frontend can read ALL original columns
      const raw = typeof r.rawData === 'object' && r.rawData !== null ? r.rawData : {};
      const obj = { ...raw, ...r };
      obj.aumAktif = r.aumAktif.toString();
      obj.aumAudit = r.aumAudit.toString();
      obj.aumBelumAudit = r.aumBelumAudit.toString();
      delete obj.rawData;
      return obj;
    });

    return NextResponse.json(serialized, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching granular report:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
