import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Temporary endpoint to seed anomaly rules into database.
// DELETE this file after seeding is done.
export async function GET() {
  try {
    const rules = [
      // PERGADAIAN
      { code: "A01", sector: "PERGADAIAN", name: "High Frequency Pawning", nameId: "Frekuensi Gadai Tinggi", description: "Customer performs more than 5 pawn transactions within 1 month", descriptionId: "Nasabah melakukan gadai lebih dari 5x dalam 1 bulan", riskWeight: 10, thresholds: { maxTransactions: 5, windowDays: 30 }, isActive: true, category: "FREQUENCY" },
      { code: "A02", sector: "PERGADAIAN", name: "Pawn Duration Check (Short Aging Large Loan)", nameId: "Hitung Aging Gadai Besar", description: "Pawn aging < 15 days with loan amount > IDR 5,000,000", descriptionId: "Aging gadai < 15 hari dengan uang pinjaman > Rp 5.000.000", riskWeight: 15, thresholds: { maxAgingDays: 15, minLoanAmount: 5000000 }, isActive: true, category: "AMOUNT" },
      { code: "A03", sector: "PERGADAIAN", name: "Unusual Top-Up Renewal Aging", nameId: "Perpanjangan Top-Up Aging Tidak Wajar", description: "Top-up renewal transaction with aging below 15 days or above 135 days", descriptionId: "Transaksi perpanjangan dengan status Top Up dengan aging gadai di bawah 15 hari atau di atas 135 hari", riskWeight: 20, thresholds: { minAgingDays: 15, maxAgingDays: 135 }, isActive: true, category: "PATTERN" },
      { code: "A04", sector: "PERGADAIAN", name: "Extreme LTV Increase on Top-Up", nameId: "Kenaikan LTV Ekstrim saat Top-Up", description: "Top-up renewal transaction with previous LTV < 70% and current LTV > 95%", descriptionId: "Transaksi perpanjangan Top Up dengan LTV sebelumnya di bawah 70% menjadi di atas 95%", riskWeight: 12, thresholds: { prevMaxLtv: 70, currentMinLtv: 95 }, isActive: true, category: "AMOUNT" },
      { code: "A05", sector: "PERGADAIAN", name: "Early Settlement (Lunas Tebus Only)", nameId: "Pelunasan Cepat (Hanya Lunas Tebus)", description: "Early settlement (Lunas Tebus only) < 3 days from disbursement date", descriptionId: "Transaksi pelunasan tebus dalam jangka waktu kurang dari 3 hari dari tanggal pencairan", riskWeight: 8, thresholds: { minSettlementDays: 3 }, isActive: true, category: "PATTERN" },
      { code: "A06", sector: "PERGADAIAN", name: "Off-Hours Transaction", nameId: "Transaksi di Luar Jam Operasional", description: "Transaction processed outside typical business hours (before 8 AM or after 8 PM)", descriptionId: "Transaksi yang dilakukan di luar jam operasional (sebelum pukul 08:00 atau setelah pukul 20:00)", riskWeight: 25, thresholds: { startHour: 8, endHour: 20 }, isActive: true, category: "TIMING" },
      { code: "A07", sector: "PERGADAIAN", name: "Cross-Branch Transactions", nameId: "Transaksi Lintas Cabang", description: "Customer performs transactions across different branch locations", descriptionId: "Nasabah (CIF) melakukan transaksi di beberapa cabang/outlet yang berbeda", riskWeight: 18, thresholds: { minBranches: 2 }, isActive: true, category: "PATTERN" },
      // MULTIFINANCE
      { code: "M01", sector: "MULTIFINANCE", name: "Overdue Installment Cluster", nameId: "Klaster Angsuran Tertunggak", description: "Debtor has > 3 consecutive overdue installments", descriptionId: "Nasabah > 3 angsuran tertunggak berturut-turut", riskWeight: 15, thresholds: { maxOverdueConsecutive: 3 }, isActive: true, category: "CREDIT" },
      { code: "M02", sector: "MULTIFINANCE", name: "Early Termination Pattern", nameId: "Pola Pelunasan Dipercepat", description: "Early settlement < 3 months from disbursement", descriptionId: "Pelunasan dipercepat < 3 bulan dari pencairan", riskWeight: 10, thresholds: { minMonthsBeforeTermination: 3 }, isActive: true, category: "PATTERN" },
      { code: "M03", sector: "MULTIFINANCE", name: "Collateral Value Discrepancy", nameId: "Diskrepansi Nilai Jaminan", description: "Vehicle collateral value > 20% below market price", descriptionId: "Nilai jaminan kendaraan > 20% di bawah harga pasar", riskWeight: 20, thresholds: { maxDiscrepancyPercent: 20 }, isActive: true, category: "COLLATERAL" },
      { code: "M04", sector: "MULTIFINANCE", name: "Dealer Concentration Risk", nameId: "Risiko Konsentrasi Dealer", description: "Single dealer > 40% of branch financing volume", descriptionId: "Satu dealer > 40% volume pembiayaan cabang", riskWeight: 25, thresholds: { maxDealerPercent: 40 }, isActive: true, category: "CONCENTRATION" },
      { code: "M05", sector: "MULTIFINANCE", name: "Fictitious Customer Pattern", nameId: "Pola Nasabah Fiktif", description: "> 3 customers with similar address/phone in 30 days", descriptionId: "> 3 nasabah alamat/telepon serupa dalam 30 hari", riskWeight: 22, thresholds: { maxSimilarCustomers: 3, windowDays: 30 }, isActive: true, category: "PATTERN" },
      { code: "M06", sector: "MULTIFINANCE", name: "Rapid Credit Approval", nameId: "Persetujuan Kredit Cepat", description: "Credit approval < 2 hours from application", descriptionId: "Approval < 2 jam dari pengajuan (bypass assessment)", riskWeight: 18, thresholds: { maxApprovalHours: 2 }, isActive: true, category: "COMPLIANCE" },
      { code: "M07", sector: "MULTIFINANCE", name: "Insurance Claim Anomaly", nameId: "Anomali Klaim Asuransi", description: "Insurance claim < 90 days from disbursement", descriptionId: "Klaim asuransi < 90 hari dari pencairan", riskWeight: 12, thresholds: { minClaimDays: 90 }, isActive: true, category: "PATTERN" },
      { code: "M08", sector: "MULTIFINANCE", name: "Excessive Top-Up", nameId: "Top-Up Berlebihan", description: "> 2 top-ups within 6 months on same contract", descriptionId: "> 2 top-up dalam 6 bulan pada kontrak yang sama", riskWeight: 8, thresholds: { maxTopUps: 2, windowMonths: 6 }, isActive: true, category: "FREQUENCY" },
      { code: "M09", sector: "MULTIFINANCE", name: "Restructuring Frequency", nameId: "Frekuensi Restrukturisasi", description: "> 2 restructurings within 12 months", descriptionId: "> 2 restrukturisasi dalam 12 bulan", riskWeight: 14, thresholds: { maxRestructurings: 2, windowMonths: 12 }, isActive: true, category: "FREQUENCY" },
      // OTOMOTIF
      { code: "O01", sector: "OTOMOTIF", name: "Pending Sales Indication", nameId: "Indikasi Pending Sales", description: "> 50% of monthly sales in last 7 days", descriptionId: "> 50% penjualan bulanan di 7 hari terakhir", riskWeight: 20, thresholds: { maxEndMonthPercent: 50 }, isActive: true, category: "TIMING" },
      { code: "O02", sector: "OTOMOTIF", name: "Leasing Dominance", nameId: "Dominasi Leasing", description: "Single leasing > 60% of credit sales per salesman", descriptionId: "Satu leasing > 60% penjualan kredit per salesman", riskWeight: 15, thresholds: { maxLeasingPercent: 60 }, isActive: true, category: "CONCENTRATION" },
      { code: "O03", sector: "OTOMOTIF", name: "Discount Abuse", nameId: "Penyalahgunaan Diskon", description: "Discount > 5% above standard matrix", descriptionId: "Diskon > 5% di atas matriks standar", riskWeight: 18, thresholds: { maxDiscountDeviation: 5 }, isActive: true, category: "PRICING" },
      { code: "O04", sector: "OTOMOTIF", name: "Workshop Revenue Anomaly", nameId: "Anomali Pendapatan Bengkel", description: "Workshop revenue drop > 20% MoM without seasonal reason", descriptionId: "Penurunan pendapatan bengkel > 20% MoM tanpa alasan musiman", riskWeight: 12, thresholds: { maxRevenueDrop: 20 }, isActive: true, category: "AMOUNT" },
      { code: "O05", sector: "OTOMOTIF", name: "Identity Fraud (STNK Mismatch)", nameId: "Penipuan Identitas (Mismatch STNK)", description: "Customer name doesn't match STNK registration name", descriptionId: "Nama konsumen tidak sesuai dengan nama di STNK", riskWeight: 22, thresholds: { minMismatchCount: 3 }, isActive: true, category: "COMPLIANCE" },
      { code: "O06", sector: "OTOMOTIF", name: "Inventory Aging", nameId: "Stok Menua (Aging Inventory)", description: "Vehicle stock aging > 90 days", descriptionId: "Stok kendaraan berumur > 90 hari", riskWeight: 10, thresholds: { maxAgingDays: 90 }, isActive: true, category: "INVENTORY" },
      { code: "O07", sector: "OTOMOTIF", name: "Test Drive Unit Abuse", nameId: "Penyalahgunaan Unit Test Drive", description: "Test drive unit KM > 5,000 without replacement", descriptionId: "KM unit test drive > 5.000 tanpa penggantian", riskWeight: 8, thresholds: { maxKm: 5000 }, isActive: true, category: "COMPLIANCE" },
      { code: "O08", sector: "OTOMOTIF", name: "Fake Booking Pattern", nameId: "Pola Booking Fiktif", description: "> 20% booking cancellation rate per salesman", descriptionId: "> 20% tingkat pembatalan booking per salesman", riskWeight: 16, thresholds: { maxCancellationRate: 20 }, isActive: true, category: "PATTERN" },
      { code: "O09", sector: "OTOMOTIF", name: "Parts Markup Anomaly", nameId: "Anomali Markup Spare Part", description: "Spare parts markup > 30% above dealer standard", descriptionId: "Markup spare part > 30% di atas standar dealer", riskWeight: 14, thresholds: { maxMarkupPercent: 30 }, isActive: true, category: "PRICING" },
    ];

    const results = [];
    for (const rule of rules) {
      const result = await (db as any).anomalyRuleConfig.upsert({
        where: { code: rule.code },
        update: {
          sector: rule.sector, name: rule.name, nameId: rule.nameId,
          description: rule.description, descriptionId: rule.descriptionId,
          riskWeight: rule.riskWeight, thresholds: rule.thresholds,
          isActive: rule.isActive, category: rule.category,
        },
        create: rule,
      });
      results.push({ code: result.code, name: result.nameId, status: "OK" });
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.length} anomaly rules into database`,
      rules: results,
    });
  } catch (error: any) {
    console.error("Seed anomaly rules error:", error);
    return NextResponse.json(
      { error: "Failed to seed anomaly rules", details: error.message },
      { status: 500 }
    );
  }
}
