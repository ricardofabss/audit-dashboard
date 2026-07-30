import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { runAnomalyDetection } from "@/lib/engines/anomaly-engine";
import { getSectorForBU } from "@/lib/business-units";
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
  SectorType,
} from "@/types/risk-intelligence";

// ─── In-Memory Cache ─────────────────────────────────────────────────
// Cache computed results for 5 minutes to avoid recomputing on every page load.
// Key: buId (or "__ALL__" for consolidated). Value: { data, timestamp }.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const resultCache = new Map<string, { data: RiskMockDataSet; timestamp: number }>();

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
    const forceRefresh = searchParams.get("refresh") === "true";
    
    // Resolve sector from buId for proper filtering
    const buSector: SectorType | null = buId ? (getSectorForBU(buId) || null) : null;
    const cacheKey = buId || "__ALL__";
    
    console.log(`[API risk-intelligence] Received request. buId=${buId}, resolvedSector=${buSector}`);
    const t0 = Date.now();

    // ─── Check Cache ──────────────────────────────────────────────────
    if (!forceRefresh) {
      const cached = resultCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        console.log(`[PERF] Cache HIT for key="${cacheKey}". Age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s. Total: ${Date.now() - t0}ms`);
        return NextResponse.json(cached.data);
      }
    }
    console.log(`[PERF] Cache MISS for key="${cacheKey}". Computing...`);

    // ─── Load anomaly rules from database ────────────────────────────
    const dbRules = await db.anomalyRuleConfig.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    const rules: AnomalyRule[] = dbRules.map((r) => ({
      id: r.id,
      code: r.code as any,
      sector: r.sector as any,
      name: r.name,
      nameId: r.nameId,
      description: r.description,
      descriptionId: r.descriptionId,
      riskWeight: r.riskWeight,
      thresholds: r.thresholds as any,
      isActive: r.isActive,
      category: r.category as any,
      createdAt: r.createdAt.toISOString().split("T")[0],
    }));

    // Fetch live events from database with flexible Business Unit matching
    let dbEvents: any[] = [];
    try {
      let buWhere: any = { deletedAt: null };
      if (buId) {
        const buVariants = [buId, buId.toLowerCase(), buId.toUpperCase()];
        if (buId.includes("pg") || buId.includes("gmn") || buId.includes("gadai")) {
          buVariants.push("GADAI_MAS", "bu-pg-gmn", "PG-GMN", "PG-GMS", "Pergadaian");
        }
        if (buId.includes("ot") || buId.includes("ysa") || buId.includes("gma") || buId.includes("dsa")) {
          buVariants.push("OTOMOTIF", "bu-ot-ysa", "OT-YSA", "bu-ot-gma", "OT-GMA", "bu-ot-dsa", "OT-DSA");
        }
        if (buId.includes("mf") || buId.includes("smf")) {
          buVariants.push("MULTIFINANCE", "bu-mf-smf", "MF-SMF");
        }

        buWhere = {
          deletedAt: null,
          OR: buVariants.map((v) => ({ businessUnit: { equals: v, mode: "insensitive" } })),
        };
      }

      dbEvents = await db.contractLifecycleEvent.findMany({
        where: buWhere,
        orderBy: [{ eventDate: "desc" }],
        take: 20000,
      });
      console.log(`[PERF] DB query: ${Date.now() - t0}ms, rows: ${dbEvents.length}`);

      // NOTE: Removed dangerous fallback that loaded ALL events across all sectors.
      // If no events match the BU filter, we return empty data for that BU.
      if (dbEvents.length === 0 && buId) {
        console.log(`[API risk-intelligence] No events found for buId=${buId}. Returning empty dataset for this BU.`);
      }
    } catch (dbError) {
      console.error("[API risk-intelligence] Database query error:", dbError);
      return NextResponse.json(
        { error: "Database connection error", details: (dbError as Error).message },
        { status: 500 }
      );
    }

    if (dbEvents.length === 0) {
      // If DB is completely empty (e.g. before initial import), return empty data
      // but keep the rules so the UI knows what they are.
      return NextResponse.json({
        anomalyRules: rules,
        anomalyDetections: [],
        customerRiskProfiles: [],
        branchRiskProfiles: [],
        officerRiskProfiles: [],
        riskScoreHistory: [],
        riskInsights: [],
        riskTrends: [],
        anomalyTrends: [],
      });
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
        id: e.id,
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
        rawMetadata: (e as any).metadata || undefined,
      };
    });

    console.log(`[PERF] Transform to transactions: ${Date.now() - t0}ms`);
    // Debug: log sample transaction metadata for the first 3 transactions
    console.log(`[API risk-intelligence] buId=${buId}, dbEvents=${dbEvents.length}, transactions=${transactions.length}`);
    if (transactions.length > 0) {
      const sample = transactions[0];
      console.log(`[API risk-intelligence] Sample tx: eventDate=${sample.eventDate}, outletCode=${sample.outletCode}, rawMetadata keys=${sample.rawMetadata ? Object.keys(sample.rawMetadata).join(',') : 'NONE'}`);
      if (sample.rawMetadata) {
        console.log(`[API risk-intelligence] Sample rawMetadata: Salesforce=${sample.rawMetadata['Salesforce']}, Cash/Credit=${sample.rawMetadata['Cash / Credit']}, Customer Name=${sample.rawMetadata['Customer Name']}, Nama STNK=${sample.rawMetadata['Nama STNK']}`);
      }
    }

    // Run the anomaly detection engine on real transactions
    // Filter rules by sector when a specific BU is selected to prevent cross-sector contamination
    const sectorFilteredRules = buSector
      ? rules.filter(r => r.sector === buSector)
      : rules; // consolidated mode: run all rules
    
    const otomotifRuleCodes = new Set(["O01", "O02", "O04", "O05"]);
    const otomotifRules = sectorFilteredRules.filter(r => otomotifRuleCodes.has(r.code));
    const nonOtomotifRules = sectorFilteredRules.filter(r => !otomotifRuleCodes.has(r.code));
    
    // Run standard rules via imported engine (only sector-appropriate rules)
    const rawDetections = runAnomalyDetection(transactions, nonOtomotifRules);
    
    // ── Inline OTOMOTIF detection ──────────────────────────────────
    type InlineDetection = {
      ruleCode: string; ruleName: string; sector: string; entityType: string;
      entityId: string; entityName: string; riskScore: number; riskWeight: number;
      outletCode: string; outletName: string; branchName: string;
      metadata: Record<string, unknown>; description: string;
    };
    const inlineDetections: InlineDetection[] = [];

    // Only run inline Otomotif detection if no sector filter or sector is OTOMOTIF
    for (const rule of otomotifRules) {
      if (!rule.isActive) continue;

      if (rule.code === "O01") {
        // Pending Sales Indication: > 50% sales in last 7 days of month per salesman
        const byMonthSalesman = new Map<string, { total: number; spike: number; salesman: string; monthStr: string; outletCode: string; outletName: string; branchName: string, txIds: string[] }>();
        for (const tx of transactions) {
          const salesman = tx.rawMetadata?.['Salesforce'] as string | undefined;
          if (!salesman) continue;
          const dateStr = tx.eventDate;
          if (!dateStr || dateStr.length < 10) continue;
          const monthStr = dateStr.substring(0, 7);
          const key = `${monthStr}_${salesman}`;
          if (!byMonthSalesman.has(key)) {
            byMonthSalesman.set(key, { total: 0, spike: 0, salesman, monthStr, outletCode: tx.outletCode, outletName: tx.outletName, branchName: tx.branchName, txIds: [] });
          }
          const group = byMonthSalesman.get(key)!;
          group.total++;
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(5, 7));
          const day = parseInt(dateStr.substring(8, 10));
          const lastDayOfMonth = new Date(year, month, 0).getDate();
          if (day > lastDayOfMonth - 7) {
            group.spike++;
            group.txIds.push(tx.id);
          }
        }
        for (const group of byMonthSalesman.values()) {
          if (group.total >= 5) {
            const spikeRatio = group.spike / group.total;
            if (spikeRatio > 0.5) {
              inlineDetections.push({
                ruleCode: "O01", ruleName: rule.name, sector: rule.sector, entityType: "OFFICER",
                entityId: `SALES-${group.salesman}`, entityName: group.salesman,
                riskScore: Math.min(100, rule.riskWeight * (spikeRatio / 0.5)), riskWeight: rule.riskWeight,
                outletCode: group.outletCode, outletName: group.outletName, branchName: group.branchName,
                metadata: { spikeRatio: (spikeRatio * 100).toFixed(1) + "%", spikeCount: group.spike, totalCount: group.total, month: group.monthStr, involvedTxIds: group.txIds },
                description: `Indikasi pending sales: ${group.spike} dari ${group.total} unit (${(spikeRatio * 100).toFixed(1)}%) dijual pada 7 hari terakhir bulan ${group.monthStr}.`,
              });
            }
          }
        }
      }

      if (rule.code === "O02") {
        // Leasing Dominance: > 60% credit sales dominated by 1 leasing per salesman
        const salesmanLeasing = new Map<string, { totalCredit: number; leasingCounts: Record<string, number>; leasingTxIds: Record<string, string[]>; outletCode: string; outletName: string; branchName: string }>();
        for (const tx of transactions) {
          const salesman = tx.rawMetadata?.['Salesforce'] as string | undefined;
          const cashOrCredit = (tx.rawMetadata?.['Cash / Credit'] as string) || '';
          if (!salesman || !cashOrCredit || cashOrCredit.toLowerCase() === 'cash') continue;
          if (!salesmanLeasing.has(salesman)) {
            salesmanLeasing.set(salesman, { totalCredit: 0, leasingCounts: {}, leasingTxIds: {}, outletCode: tx.outletCode, outletName: tx.outletName, branchName: tx.branchName });
          }
          const group = salesmanLeasing.get(salesman)!;
          group.totalCredit++;
          group.leasingCounts[cashOrCredit] = (group.leasingCounts[cashOrCredit] || 0) + 1;
          if (!group.leasingTxIds[cashOrCredit]) group.leasingTxIds[cashOrCredit] = [];
          group.leasingTxIds[cashOrCredit].push(tx.id);
        }
        for (const [salesman, group] of salesmanLeasing.entries()) {
          if (group.totalCredit >= 5) {
            let maxLeasing = ""; let maxCount = 0;
            for (const [leasing, count] of Object.entries(group.leasingCounts)) {
              if (count > maxCount) { maxCount = count; maxLeasing = leasing; }
            }
            const dominanceRatio = maxCount / group.totalCredit;
            if (dominanceRatio > 0.6) {
              inlineDetections.push({
                ruleCode: "O02", ruleName: rule.name, sector: rule.sector, entityType: "OFFICER",
                entityId: `SALES-${salesman}`, entityName: salesman,
                riskScore: Math.min(100, rule.riskWeight * (dominanceRatio / 0.6)), riskWeight: rule.riskWeight,
                outletCode: group.outletCode, outletName: group.outletName, branchName: group.branchName,
                metadata: { leasingCompany: maxLeasing, dominanceRatio: (dominanceRatio * 100).toFixed(1) + "%", involvedTxIds: group.leasingTxIds[maxLeasing] },
                description: `Dominasi leasing: ${maxLeasing} menguasai ${(dominanceRatio * 100).toFixed(1)}% dari total ${group.totalCredit} penjualan kredit oleh ${salesman}.`,
              });
            }
          }
        }
      }

      if (rule.code === "O05") {
        // Identity Fraud: Customer Name != STNK Name
        const bySalesman = new Map<string, { count: number; txIds: string[]; outletCode: string; outletName: string; branchName: string }>();
        for (const tx of transactions) {
          const customerName = tx.rawMetadata?.['Customer Name'] as string | undefined;
          const stnkName = tx.rawMetadata?.['Nama STNK'] as string | undefined;
          const salesman = tx.rawMetadata?.['Salesforce'] as string | undefined;
          if (salesman && customerName && stnkName) {
            const name1 = customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const name2 = stnkName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (name1 !== name2 && name1.length > 0 && name2.length > 0) {
              if (!bySalesman.has(salesman)) {
                bySalesman.set(salesman, { count: 0, txIds: [], outletCode: tx.outletCode, outletName: tx.outletName, branchName: tx.branchName });
              }
              const group = bySalesman.get(salesman)!;
              group.count++;
              group.txIds.push(tx.id);
            }
          }
        }
        for (const [salesman, group] of bySalesman.entries()) {
          if (group.count >= 3) {
            inlineDetections.push({
              ruleCode: "O05", ruleName: rule.name, sector: rule.sector, entityType: "OFFICER",
              entityId: `SALES-${salesman}`, entityName: salesman,
              riskScore: Math.min(100, rule.riskWeight * (group.count / 3)), riskWeight: rule.riskWeight,
              outletCode: group.outletCode, outletName: group.outletName, branchName: group.branchName,
              metadata: { mismatchCount: group.count, involvedTxIds: group.txIds },
              description: `Indikasi penipuan identitas: Salesman ${salesman} memiliki ${group.count} transaksi dengan nama konsumen yang tidak sesuai dengan nama di STNK.`,
            });
          }
        }
      }
      // O04 skipped — requires workshop data not yet uploaded
    }

    // Merge inline detections into rawDetections
    let detectionCounter = Date.now();
    for (const d of inlineDetections) {
      rawDetections.push({
        id: `AD-${detectionCounter++}`,
        ruleCode: d.ruleCode as any,
        ruleName: d.ruleName,
        sector: d.sector as any,
        businessUnitId: buId || "",
        entityType: d.entityType as any,
        entityId: d.entityId,
        entityName: d.entityName,
        outletCode: d.outletCode,
        outletName: d.outletName,
        branchName: d.branchName,
        riskScore: Math.round(d.riskScore),
        riskWeight: d.riskWeight,
        status: "DETECTED" as any,
        detectedAt: new Date().toISOString().split("T")[0],
        metadata: d.metadata,
        description: d.description,
      });
    }
    
    console.log(`[PERF] Anomaly detection engine: ${Date.now() - t0}ms`);
    console.log(`[API risk-intelligence] rawDetections count=${rawDetections.length} (inline otomotif: ${inlineDetections.length}), sectorFilteredRules: ${sectorFilteredRules.map(r => r.code).join(',')}, allRules: ${rules.length}`);

    // Override the generic detection dates with the transaction event date for realism
    const detections: AnomalyDetection[] = rawDetections.map(d => {
      const matchTx = transactions.find(t => 
        t.customerId === d.entityId || 
        t.outletCode === d.entityId || 
        (d.metadata && t.contractNo === d.metadata.contractNo)
      );
      return {
        ...d,
        detectedAt: matchTx ? matchTx.eventDate : d.detectedAt,
        outletCode: matchTx ? matchTx.outletCode : (d.metadata?.outletCode as string || d.outletCode),
        outletName: matchTx ? matchTx.outletName : (d.entityType === "BRANCH" ? d.entityName : (d.metadata?.branchName as string || "")),
        branchName: matchTx ? matchTx.branchName : (d.metadata?.branchName as string || ""),
        businessUnitId: buId || d.businessUnitId || "",
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
        sector: cDetections[0]?.sector || buSector || "PERGADAIAN",
        businessUnitId: buId || cDetections[0]?.businessUnitId || "",
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
            status: d.status,
            contractNo: d.metadata?.contractNo || "-",
            statusPerpanjangan: d.metadata?.statusPerpanjangan || "Aktif",
            loanAmount: d.metadata?.loanAmount || 0,
            agingDays: d.metadata?.agingDays || 0,
            description: d.description || "",
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

      // Determine sector from detections at this outlet, or from BU, or from rule sector
      const outletSector = oDetections.length > 0 ? oDetections[0].sector : (buSector || "PERGADAIAN");
      branchRiskProfiles.push({
        id: `BRANCH-PROF-${outletCode}`,
        sector: outletSector,
        businessUnitId: buId || (oDetections.length > 0 ? oDetections[0].businessUnitId : ""),
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

    // Officer profiles are derived from real DB data or empty if not available
    const officerDetections = detections.filter(d => d.entityType === "OFFICER");
    const officerRiskProfiles: OfficerRiskProfile[] = [];
    const uniqueOfficerIds = Array.from(new Set(officerDetections.map(d => d.entityId)));

    for (const officerId of uniqueOfficerIds) {
      const oDetections = officerDetections.filter(d => d.entityId === officerId);
      const totalScore = Math.round(oDetections.reduce((sum, d) => sum + d.riskScore, 0) / oDetections.length);
      const sampleDetection = oDetections[0];
      
      officerRiskProfiles.push({
        id: `OFF-PROF-${officerId}`,
        sector: sampleDetection.sector || buSector || "PERGADAIAN",
        businessUnitId: buId || sampleDetection.businessUnitId || "",
        officerId,
        officerName: sampleDetection.entityName,
        position: officerId.startsWith("SALES") ? "Salesman" : (officerId.startsWith("MECH") ? "Mechanic" : "Officer"),
        outletCode: sampleDetection.outletCode || "000",
        outletName: sampleDetection.outletName || "Unknown Outlet",
        branchName: sampleDetection.branchName || "Unknown Branch",
        totalScore,
        riskLevel: riskLevelFromScore(totalScore),
        anomalyCount: oDetections.length,
        activeAnomalies: oDetections.filter(d => d.status === "DETECTED" || d.status === "CONFIRMED").length,
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
        handledTransactions: oDetections.length * 5,
        supervisoryGapScore: Math.round(totalScore * 0.4),
        trend: 0,
        trendDirection: "STABLE",
        updatedAt: new Date().toISOString().split("T")[0],
      });
    }

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
        sector: d.sector || buSector || "PERGADAIAN",
        businessUnitId: buId || d.businessUnitId || "",
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
      riskScoreHistory: [],
      riskInsights,
      riskTrends,
      anomalyTrends,
    };

    if (!buId) {
      console.log(`[API] Consolidated mode (Real Data only)`);
    }

    // ─── Store in Cache ───────────────────────────────────────────────
    resultCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });

    console.log(`[PERF] Total API time: ${Date.now() - t0}ms (COMPUTED & CACHED as "${cacheKey}")`);
    console.log(`[API risk-intelligence] Returning response for buId=${buId}. rulesCount=${responsePayload.anomalyRules.length}, detectionsCount=${responsePayload.anomalyDetections.length}`);
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Error in risk-intelligence API:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
