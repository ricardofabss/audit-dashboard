import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runAnomalyDetection } from "@/lib/engines/anomaly-engine";
import { getRiskData, getMockDataForBU } from "@/lib/risk-mock-data";
import type {
  AnomalyRule,
  AnomalyDetection,
  CustomerRiskProfile,
  BranchRiskProfile,
  OfficerRiskProfile,
  RiskScoreSnapshot,
  RiskInsight,
  RiskTrendDataPoint,
  AnomalyTrendDataPoint,
  RiskLevel,
  AnomalyStatus,
  RiskMockDataSet,
} from "@/types/risk-intelligence";

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function getCustomerLabel(customerId: string): string {
  if (!customerId) return "Nasabah Walk-in";
  
  const names = [
    "Agus Prasetyo", "Siti Aminah", "Dewi Lestari", "Budi Santoso", "Sri Wahyuni",
    "Ahmad Hidayat", "Eko Wibowo", "Rina Kartika", "Hendra Wijaya", "Indah Permata",
    "Joko Susilo", "Mega Utami", "Rudi Hermawan", "Anisa Rahma", "Taufik Rahman",
    "Yanti Sulistyo", "Dedi Kurniawan", "Fitri Handayani", "Bambang Sugeng", "Lia Novita",
    "Hadi Syahputra", "Wulandari", "Andi Wijaya", "Rian Hidayat", "Yusuf Mansur",
    "Diana Putri", "Mulyadi", "Kartika Sari", "Edi Suprianto", "Ratna Sari",
    "Doni Setiawan", "Rini Astuti", "Aris Munandar", "Novianti", "Fajar Nugraha",
    "Siska Wahyuni", "Sigit Purnomo", "Diah Lestari", "Wahyu Hidayat", "Sri Lestari"
  ];
  
  // Deterministic hash based on customerId string
  let hash = 0;
  for (let i = 0; i < customerId.length; i++) {
    hash = customerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % names.length;
  return names[idx];
}

// ─── Branch-level timezone lookup table ──────────────────────────────
// All outlets under a branch share the same timezone.
// Add new branches here as data expands.
const BRANCH_TIMEZONE: Record<string, number> = {
  // WIB (UTC+7) — Jawa, Sumatera, Kalimantan Barat & Tengah
  "132-MAS SUMENEP": 7,   // Sumenep, Madura, Jawa Timur

  // WITA (UTC+8) — NTB, NTT, Bali, Sulawesi, Kalimantan Selatan/Timur/Utara
  "359-MAS TENTE": 8,     // Tente, Bima, Nusa Tenggara Barat

  // WIT (UTC+9) — Papua, Maluku
  // (tambahkan cabang Papua/Maluku di sini jika ada)
};

function getTimezoneOffsetHours(regionName?: string | null, branchName?: string | null, outletName?: string | null): number {
  // IMPORTANT: eventTs is stored in UTC in PostgreSQL because JavaScript's
  // new Date("...") converts the naive WIB datetime from Python to UTC during import.
  // Example: Excel "09:32" WIB → Python "T09:32:00" → JS treats as local WIB → stores as 02:32 UTC.
  // Therefore these offsets must be the FULL UTC-to-local offset, NOT relative offsets.

  // 1. Primary: Branch-level lookup (most accurate)
  if (branchName) {
    const trimmed = branchName.trim();
    if (BRANCH_TIMEZONE[trimmed] !== undefined) {
      return BRANCH_TIMEZONE[trimmed];
    }
  }

  // 2. Fallback: Keyword matching for branches not yet in the lookup table
  const searchStr = `${regionName || ""} ${branchName || ""} ${outletName || ""}`.toLowerCase();

  // WIT regions (UTC+9)
  if (
    searchStr.includes("papua") ||
    searchStr.includes("maluku") ||
    searchStr.includes("jayapura") ||
    searchStr.includes("ambon") ||
    searchStr.includes("sorong") ||
    searchStr.includes("manokwari") ||
    searchStr.includes("ternate")
  ) {
    return 9;
  }

  // WITA regions (UTC+8)
  if (
    searchStr.includes("sulawesi") ||
    searchStr.includes("makassar") ||
    searchStr.includes("manado") ||
    searchStr.includes("palu") ||
    searchStr.includes("kendari") ||
    searchStr.includes("gorontalo") ||
    searchStr.includes("bali") ||
    searchStr.includes("denpasar") ||
    searchStr.includes("lombok") ||
    searchStr.includes("ntb") ||
    searchStr.includes("ntt") ||
    searchStr.includes("kupang") ||
    searchStr.includes("flores") ||
    searchStr.includes("mataram") ||
    searchStr.includes("bima") ||
    searchStr.includes("sumbawa") ||
    searchStr.includes("dompu") ||
    searchStr.includes("tente") ||
    searchStr.includes("sape") ||
    searchStr.includes("wawo") ||
    searchStr.includes("kalimantan selatan") ||
    searchStr.includes("kalimantan timur") ||
    searchStr.includes("kalimantan utara") ||
    searchStr.includes("banjarmasin") ||
    searchStr.includes("samarinda") ||
    searchStr.includes("balikpapan") ||
    searchStr.includes("kaltim") ||
    searchStr.includes("kalsel")
  ) {
    return 8;
  }

  // Default is WIB (UTC+7)
  return 7;
}

function getTimezoneSuffix(regionName?: string | null, branchName?: string | null, outletName?: string | null): string {
  const offset = getTimezoneOffsetHours(regionName, branchName, outletName);
  if (offset === 8) return "WITA";
  if (offset === 9) return "WIT";
  return "WIB";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buId = searchParams.get("buId");

    // Retrieve the active rules for this BU
    const mockDataSet = getRiskData(buId);
    const rules = mockDataSet.anomalyRules;

    // Query database events
    // If it's a specific non-pawnshop BU, database might not have records yet,
    // so we can fall back to mock data to keep the dashboard populated.
    const isPawnshop = !buId || buId === "bu-pg-gmn" || buId === "bu-pg-gms";

    if (!isPawnshop) {
      // Fallback for multifinance/automotive if no data in db
      return NextResponse.json(getMockDataForBU(buId));
    }

    // Fetch live events from database
    const dbEvents = await db.contractLifecycleEvent.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [
        { eventDate: "desc" },
      ],
      take: 2000, // limit to recent 2000 events for query performance
    });

    if (dbEvents.length === 0) {
      // If DB is completely empty (e.g. before initial import), use mock data
      return NextResponse.json(mockDataSet);
    }

    // Map database events to the TransactionInput shape expected by the anomaly engine
    const transactions = dbEvents.map(e => {
      const loanAmt = e.loanInitial ? Number(e.loanInitial) : (e.principalInitial ? Number(e.principalInitial) : 0);
      const rawCustId = e.customerId || `CIF-${Math.floor(10000 + Math.random() * 90000)}`;
      let custId = rawCustId;
      let custName = "Nasabah Walk-in";
      
      if (rawCustId.includes(" | ")) {
        const parts = rawCustId.split(" | ");
        custId = parts[0];
        custName = parts[1];
      } else {
        custName = getCustomerLabel(custId);
      }

      // Calculate branch local time from DB timestamp.
      // The eventTs is stored in UTC in PostgreSQL because during import,
      // JS new Date() converted the naive WIB datetime to UTC (subtracting 7 hours).
      // We must add back the full UTC offset to recover the original local time.
      let localTime = "10:00";
      let tzSuffix = "WIB";
      if (e.eventTs) {
        const utcHours = e.eventTs.getUTCHours();
        const utcMinutes = e.eventTs.getUTCMinutes();
        
        const offset = getTimezoneOffsetHours(e.regionName, e.branchName, e.outletName);
        const localHours = (utcHours + offset) % 24;
        
        const hoursStr = String(localHours).padStart(2, "0");
        const minutesStr = String(utcMinutes).padStart(2, "0");
        localTime = `${hoursStr}:${minutesStr}`;
        tzSuffix = getTimezoneSuffix(e.regionName, e.branchName, e.outletName);
      }

      return {
        contractNo: e.contractNo,
        rootContractNo: e.rootContractNo,
        customerId: custId,
        customerName: custName,
        outletCode: e.outletCode,
        outletName: e.outletName || `Outlet ${e.outletCode}`,
        branchName: e.branchName || `Cabang ${e.outletCode}`,
        regionName: e.regionName || undefined,
        areaName: e.areaName || undefined,
        timezone: tzSuffix,
        officerId: "OFF-DEFAULT",
        officerName: "Petugas Penilai",
        eventType: e.eventType as any,
        eventDate: e.eventDate.toISOString().split("T")[0],
        eventTime: localTime,
        loanAmount: loanAmt,
        ltvRatio: e.ltvRatio ? Number(e.ltvRatio) : 0,
        agingDays: e.overdueDays || 0,
        renewalCount: e.renewalCount || 0,
        disbursementDate: e.disbursementDate ? e.disbursementDate.toISOString().split("T")[0] : undefined,
        settlementDate: e.settlementDate ? e.settlementDate.toISOString().split("T")[0] : undefined,
        settlementStatus: e.settlementStatus || undefined,
      };
    });

    // Run the anomaly detection engine on real transactions
    const rawDetections = runAnomalyDetection(transactions, rules);

    // Override the generic detection dates with the transaction event date for realism
    const detections: AnomalyDetection[] = rawDetections.map(d => {
      const matchTx = transactions.find(t => 
        t.customerId === d.entityId || 
        t.outletCode === d.entityId || 
        t.contractNo === d.metadata.contractNo ||
        (d.metadata && t.contractNo === d.metadata.contractNo)
      );
      return {
        ...d,
        detectedAt: matchTx ? matchTx.eventDate : d.detectedAt,
        outletCode: matchTx ? matchTx.outletCode : d.outletCode,
        outletName: matchTx ? matchTx.outletName : (d.entityType === "BRANCH" ? d.entityName : ""),
        branchName: matchTx ? matchTx.branchName : "",
        businessUnitId: buId || "bu-pg-gmn",
      };
    });

    // Group detections by customer to construct CustomerRiskProfile
    const customerDetections = detections.filter(d => d.entityType === "CUSTOMER");
    const customerRiskProfiles: CustomerRiskProfile[] = [];
    const uniqueCustomerIds = Array.from(new Set(customerDetections.map(d => d.entityId)));

    for (const customerId of uniqueCustomerIds) {
      const cDetections = customerDetections.filter(d => d.entityId === customerId);
      const totalScore = Math.round(cDetections.reduce((sum, d) => sum + d.riskScore, 0) / cDetections.length);
      const cTxns = transactions.filter(t => t.customerId === customerId);
      
      customerRiskProfiles.push({
        id: `CUST-PROF-${customerId}`,
        sector: "PERGADAIAN",
        businessUnitId: buId || "bu-pg-gmn",
        customerId,
        customerName: cDetections[0].entityName,
        cifNumber: customerId,
        primaryOutlet: cTxns[0]?.outletName || cDetections[0].outletName || "Unknown",
        primaryBranch: cTxns[0]?.branchName || cDetections[0].branchName || "Unknown",
        totalScore,
        riskLevel: riskLevelFromScore(totalScore),
        anomalyCount: cDetections.length,
        activeAnomalies: cDetections.filter(d => d.status === "DETECTED" || d.status === "CONFIRMED").length,
        breakdown: {
          items: cDetections.map(d => ({
            ruleCode: d.ruleCode,
            ruleName: d.ruleName,
            occurrences: 1,
            weightedScore: d.riskScore,
            lastDetected: d.detectedAt,
          })),
          totalRawScore: cDetections.reduce((sum, d) => sum + d.riskScore, 0),
          normalizedScore: totalScore,
          velocityFactor: 1,
          decayApplied: false,
        },
        transactionCount: cTxns.length,
        totalLoanAmount: cTxns.reduce((sum, t) => sum + t.loanAmount, 0),
        firstTransactionDate: cTxns[cTxns.length - 1]?.eventDate || new Date().toISOString().split("T")[0],
        lastTransactionDate: cTxns[0]?.eventDate || new Date().toISOString().split("T")[0],
        trend: 0,
        trendDirection: "STABLE",
        updatedAt: new Date().toISOString().split("T")[0],
      });
    }

    // Group detections by branch to construct BranchRiskProfile
    const branchDetections = detections.filter(d => d.entityType === "BRANCH" || d.outletCode);
    const branchRiskProfiles: BranchRiskProfile[] = [];
    const uniqueOutletCodes = Array.from(new Set(transactions.map(t => t.outletCode)));

    for (const outletCode of uniqueOutletCodes) {
      const oDetections = branchDetections.filter(d => d.outletCode === outletCode);
      const oTxns = transactions.filter(t => t.outletCode === outletCode);
      const totalScore = oDetections.length > 0
        ? Math.min(100, Math.round(oDetections.reduce((sum, d) => sum + d.riskScore, 0) / oDetections.length) + oDetections.length * 2)
        : 10; // Low baseline if no anomalies

      const sampleTx = oTxns[0];

      // Calculate branch average pawn duration from transactions that have disbursementDate
      const durations = oTxns
        .filter(t => t.disbursementDate)
        .map(t => {
          const start = new Date(t.disbursementDate!);
          const end = t.settlementDate ? new Date(t.settlementDate) : new Date(t.eventDate);
          return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        });
      const avgPawnDuration = durations.length > 0
        ? Number((durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(1))
        : 0;

      branchRiskProfiles.push({
        id: `BRANCH-PROF-${outletCode}`,
        sector: "PERGADAIAN",
        businessUnitId: buId || "bu-pg-gmn",
        outletCode,
        outletName: sampleTx.outletName,
        branchName: sampleTx.branchName,
        regionName: sampleTx.regionName || "DKI Jakarta",
        areaName: sampleTx.areaName || "Jabodetabek",
        totalScore,
        riskLevel: riskLevelFromScore(totalScore),
        anomalyCount: oDetections.length,
        activeAnomalies: oDetections.filter(d => d.status === "DETECTED" || d.status === "CONFIRMED").length,
        customerCount: Array.from(new Set(oTxns.map(t => t.customerId))).length,
        highRiskCustomerCount: customerRiskProfiles.filter(c => c.primaryOutlet === sampleTx.outletName && (c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL")).length,
        breakdown: {
          items: oDetections.map(d => ({
            ruleCode: d.ruleCode,
            ruleName: d.ruleName,
            occurrences: 1,
            weightedScore: d.riskScore,
            lastDetected: d.detectedAt,
          })),
          totalRawScore: oDetections.reduce((sum, d) => sum + d.riskScore, 0),
          normalizedScore: totalScore,
          velocityFactor: 1,
          decayApplied: false,
        },
        transactionVolume: oTxns.length,
        totalPortfolioValue: oTxns.reduce((sum, t) => sum + t.loanAmount, 0),
        anomalyDensity: +(oDetections.length / Math.max(1, oTxns.length / 100)).toFixed(1),
        trend: 0,
        trendDirection: "STABLE",
        updatedAt: new Date().toISOString().split("T")[0],
        avgPawnDuration,
      });
    }

    // Keep mock profiles for Officers to avoid empty lists, but update metadata
    const officerRiskProfiles: OfficerRiskProfile[] = mockDataSet.officerRiskProfiles.map(o => ({
      ...o,
      businessUnitId: buId || "bu-pg-gmn",
    }));

    // Group transactions by month for trend calculations
    const monthlyGroups = new Map<string, { 
      customerScores: number[]; 
      branchScores: number[]; 
      anomalies: number;
      txs: typeof transactions;
    }>();

    for (const tx of transactions) {
      const month = tx.eventDate.substring(0, 7); // YYYY-MM
      if (!monthlyGroups.has(month)) {
        monthlyGroups.set(month, { customerScores: [], branchScores: [], anomalies: 0, txs: [] });
      }
      monthlyGroups.get(month)!.txs.push(tx);
    }

    for (const d of detections) {
      const month = d.detectedAt.substring(0, 7);
      if (monthlyGroups.has(month)) {
        monthlyGroups.get(month)!.anomalies += 1;
      }
    }

    for (const c of customerRiskProfiles) {
      const month = c.lastTransactionDate.substring(0, 7);
      if (monthlyGroups.has(month)) {
        monthlyGroups.get(month)!.customerScores.push(c.totalScore);
      }
    }

    for (const b of branchRiskProfiles) {
      const month = b.updatedAt.substring(0, 7);
      if (monthlyGroups.has(month)) {
        monthlyGroups.get(month)!.branchScores.push(b.totalScore);
      }
    }

    // Build riskTrends dynamically
    const riskTrends: RiskTrendDataPoint[] = Array.from(monthlyGroups.entries()).map(([month, data]) => {
      const [year, mStr] = month.split("-");
      const dateObj = new Date(Number(year), Number(mStr) - 1, 1);
      const period = dateObj.toLocaleString("en", { month: "short", year: "numeric" });
      
      const customerAvg = data.customerScores.length > 0
        ? Math.round(data.customerScores.reduce((sum, s) => sum + s, 0) / data.customerScores.length)
        : 35;
      const branchAvg = data.branchScores.length > 0
        ? Math.round(data.branchScores.reduce((sum, s) => sum + s, 0) / data.branchScores.length)
        : 40;

      // Calculate population standard deviation of branch average pawn durations for this month.
      const monthTxs = data.txs;
      
      // 1. Group transactions of this month by branch (outletCode)
      const branchTxs = new Map<string, number[]>(); // outletCode -> list of durations
      for (const tx of monthTxs) {
        if (!tx.disbursementDate) continue;
        
        const start = new Date(tx.disbursementDate);
        const end = tx.settlementDate ? new Date(tx.settlementDate) : new Date(tx.eventDate);
        const duration = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        
        if (!branchTxs.has(tx.outletCode)) {
          branchTxs.set(tx.outletCode, []);
        }
        branchTxs.get(tx.outletCode)!.push(duration);
      }
      
      // 2. Calculate average duration for each branch
      const branchAverages: number[] = [];
      for (const [, durations] of branchTxs.entries()) {
        if (durations.length > 0) {
          const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
          branchAverages.push(avg);
        }
      }
      
      // 3. Calculate population standard deviation
      let durationStdDev = 0;
      const N = branchAverages.length;
      if (N > 0) {
        const mean = branchAverages.reduce((sum, a) => sum + a, 0) / N;
        const variance = branchAverages.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / N;
        durationStdDev = Number(Math.sqrt(variance).toFixed(1));
      }
        
      return {
        period,
        customerAvg,
        branchAvg,
        officerAvg: Math.max(0, Math.round((customerAvg + branchAvg) / 2) - 10),
        anomalyCount: data.anomalies,
        durationStdDev,
      };
    }).sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());

    // Build anomalyTrends dynamically
    const anomalyTrends: AnomalyTrendDataPoint[] = Array.from(monthlyGroups.entries()).map(([month, data]) => {
      const [year, mStr] = month.split("-");
      const dateObj = new Date(Number(year), Number(mStr) - 1, 1);
      const period = dateObj.toLocaleString("en", { month: "short", year: "numeric" });
      
      const vals: Record<string, number> = {};
      for (const rule of rules) {
        vals[rule.code] = detections.filter(d => d.ruleCode === rule.code && d.detectedAt.substring(0, 7) === month).length;
      }
      
      return {
        period,
        ...vals,
        total: Object.values(vals).reduce((sum, v) => sum + v, 0),
      };
    }).sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());

    // Build riskInsights dynamically from live detections
    const riskInsights: RiskInsight[] = detections.slice(0, 15).map((d, idx) => {
      const severity = d.riskScore >= 80 ? "CRITICAL" : d.riskScore >= 60 ? "HIGH" : d.riskScore >= 35 ? "MEDIUM" : "LOW";
      const category = d.riskScore >= 80 ? "ALERT" : "TREND";
      return {
        id: `INSIGHT-${d.id}`,
        sector: "PERGADAIAN",
        businessUnitId: buId || "bu-pg-gmn",
        entityType: d.entityType,
        entityId: d.entityId,
        entityName: d.entityName,
        severity,
        category,
        confidence: Math.round(80 + (d.riskScore / 100) * 18),
        isRead: false,
        actionTaken: false,
        generatedAt: d.detectedAt,
        insightText: `Pola anomali ${d.ruleCode} (${d.ruleName}) terdeteksi pada ${d.entityName} di ${d.outletName || "Cabang"}: ${d.description}`,
        insightTextId: `Pola anomali ${d.ruleCode} (${d.ruleName}) terdeteksi pada ${d.entityName} di ${d.outletName || "Cabang"}: ${d.description}`,
      };
    });

    const responsePayload: RiskMockDataSet = {
      anomalyRules: rules,
      anomalyDetections: detections,
      customerRiskProfiles: customerRiskProfiles.sort((a, b) => b.totalScore - a.totalScore),
      branchRiskProfiles: branchRiskProfiles.sort((a, b) => b.totalScore - a.totalScore),
      officerRiskProfiles,
      riskScoreHistory: mockDataSet.riskScoreHistory, // maintain history mapping
      riskInsights,
      riskTrends,
      anomalyTrends,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Error in risk-intelligence API:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
