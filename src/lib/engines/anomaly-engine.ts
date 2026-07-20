/**
 * Anomaly Detection Engine
 * Client-side rule engine implementing A01-A09 anomaly detection rules.
 * Each rule is a pure function that evaluates transaction data against thresholds.
 */

import type {
  AnomalyRule,
  AnomalyDetection,
  AnomalyRuleCode,
  AnomalyStatus,
  RiskEntityType,
} from "@/types/risk-intelligence";

// ─── Rule Evaluation Result ──────────────────────────────────────────

export type RuleEvaluation = {
  triggered: boolean;
  ruleCode: AnomalyRuleCode;
  entityType: RiskEntityType;
  entityId: string;
  entityName: string;
  riskScore: number;
  metadata: Record<string, unknown>;
  description: string;
};

// ─── Transaction Input (simplified for client-side) ──────────────────

export type TransactionInput = {
  contractNo: string;
  rootContractNo: string;
  customerId: string;
  customerName: string;
  outletCode: string;
  outletName: string;
  branchName: string;
  regionName?: string;
  timezone?: string;
  officerId: string;
  officerName: string;
  eventType: "BOOKING_NEW" | "BOOKING_RENEWAL" | "SETTLEMENT";
  eventDate: string;
  eventTime?: string; // HH:mm format
  loanAmount: number;
  ltvRatio: number;
  agingDays: number;
  renewalCount: number;
  disbursementDate?: string;
  settlementDate?: string;
  settlementStatus?: string;
  rawMetadata?: Record<string, any>;
};

// ─── Rule Implementations ────────────────────────────────────────────

type RuleFunction = (
  transactions: TransactionInput[],
  rule: AnomalyRule,
) => RuleEvaluation[];

/**
 * A01 — High Frequency Pawning
 * CIF > 5 transactions in 30 days
 */
const evaluateA01: RuleFunction = (transactions, rule) => {
  const maxTxn = (rule.thresholds.maxTransactions as number) || 5;
  const windowDays = (rule.thresholds.windowDays as number) || 30;
  const results: RuleEvaluation[] = [];

  // Group by customer
  const byCustomer = new Map<string, TransactionInput[]>();
  for (const tx of transactions) {
    if (!byCustomer.has(tx.customerId)) byCustomer.set(tx.customerId, []);
    byCustomer.get(tx.customerId)!.push(tx);
  }

  for (const [customerId, txns] of byCustomer) {
    // Sliding window: check any 30-day window
    const sorted = txns.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    for (let i = 0; i < sorted.length; i++) {
      const windowStart = new Date(sorted[i].eventDate);
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() + windowDays);

      const inWindow = sorted.filter(t => {
        const d = new Date(t.eventDate);
        return d >= windowStart && d <= windowEnd;
      });

      if (inWindow.length > maxTxn) {
        results.push({
          triggered: true,
          ruleCode: "A01",
          entityType: "CUSTOMER",
          entityId: customerId,
          entityName: sorted[0].customerName,
          riskScore: Math.min(100, rule.riskWeight * Math.floor(inWindow.length / maxTxn)),
          metadata: { transactionCount: inWindow.length, windowDays, period: sorted[i].eventDate },
          description: `${sorted[0].customerName} performed ${inWindow.length} transactions in ${windowDays} days (threshold: ${maxTxn})`,
        });
        break; // One detection per customer
      }
    }
  }

  return results;
};

/**
 * A02 — Large Loan Early Pawn (Pinjaman Besar Durasi Singkat)
 * Detects large loans with very short aging between disbursement and settlement/event.
 * 
 * Business context (statusPerpanjangan di Booking.xlsx):
 * - Kosong + ada tanggalPelunasan = Lunas Tebus
 * - Top Up = perpanjangan + naik pinjaman/LTV
 * - Top Down = perpanjangan + bayar pokok sebagian
 * - Murni = perpanjangan jatuh tempo saja
 */
const evaluateA02: RuleFunction = (transactions, rule) => {
  const maxAging = (rule.thresholds.maxAgingDays as number) || 15;
  const minLoan = (rule.thresholds.minLoanAmount as number) || 5000000;
  const results: RuleEvaluation[] = [];

  for (const tx of transactions) {
    if (!tx.disbursementDate || !tx.settlementDate) continue;
    const start = new Date(tx.disbursementDate);
    const end = new Date(tx.settlementDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays < maxAging && tx.loanAmount > minLoan) {
      const status = tx.settlementStatus?.trim() || "Lunas Tebus";
      results.push({
        triggered: true,
        ruleCode: "A02",
        entityType: "CUSTOMER",
        entityId: tx.customerId,
        entityName: tx.customerName,
        riskScore: Math.min(100, rule.riskWeight * (1 + tx.loanAmount / 10000000)),
        metadata: { agingDays: diffDays, loanAmount: tx.loanAmount, contractNo: tx.contractNo, statusPerpanjangan: status },
        description: `${tx.customerName}: pinjaman IDR ${tx.loanAmount.toLocaleString()} dengan aging ${diffDays} hari (${status})`,
      });
    }
  }

  return results;
};

/**
 * A03 — Excessive Renewal Chain (Modified to: Top-Up renewal with aging < 15 days or > 135 days)
 */
const evaluateA03: RuleFunction = (transactions, rule) => {
  const results: RuleEvaluation[] = [];

  for (const tx of transactions) {
    if (tx.eventType !== "BOOKING_RENEWAL") continue;
    const status = tx.settlementStatus ? tx.settlementStatus.trim() : "";
    if (status.toLowerCase() !== "top up") continue;

    // Find parent transaction
    const parentTx = transactions.find(t => t.contractNo === tx.rootContractNo);
    const startStr = parentTx?.disbursementDate || tx.eventDate || tx.disbursementDate;
    if (!startStr) continue;

    const start = new Date(startStr);
    const end = new Date(tx.eventDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && (diffDays < 15 || diffDays > 135)) {
      results.push({
        triggered: true,
        ruleCode: "A03",
        entityType: "CUSTOMER",
        entityId: tx.customerId,
        entityName: tx.customerName,
        riskScore: Math.min(100, rule.riskWeight * (diffDays < 15 ? 2.0 : 1.5)),
        metadata: { agingDays: diffDays, statusPerpanjangan: status, contractNo: tx.contractNo, parentContractNo: tx.rootContractNo },
        description: `${tx.customerName}: renewed contract ${tx.contractNo} (Top Up) with aging of ${diffDays} days (outside 15-135 days range)`,
      });
    }
  }

  return results;
};

/**
 * A04 — High LTV Ratio (Modified to: LTV previous < 70% to current > 95% on Top-Up renewal)
 */
const evaluateA04: RuleFunction = (transactions, rule) => {
  const results: RuleEvaluation[] = [];

  for (const tx of transactions) {
    if (tx.eventType !== "BOOKING_RENEWAL") continue;
    const status = tx.settlementStatus ? tx.settlementStatus.trim() : "";
    if (status.toLowerCase() !== "top up") continue;

    const currentLtv = tx.ltvRatio > 1.5 ? tx.ltvRatio : tx.ltvRatio * 100;
    if (currentLtv <= 95) continue;

    // Find parent transaction LTV
    const parentTx = transactions.find(t => t.contractNo === tx.rootContractNo);
    if (!parentTx) continue;

    const prevLtv = parentTx.ltvRatio > 1.5 ? parentTx.ltvRatio : parentTx.ltvRatio * 100;

    if (prevLtv < 70 && currentLtv > 95) {
      results.push({
        triggered: true,
        ruleCode: "A04",
        entityType: "CUSTOMER",
        entityId: tx.customerId,
        entityName: tx.customerName,
        riskScore: Math.min(100, rule.riskWeight + (currentLtv - prevLtv)),
        metadata: { currentLtv: +currentLtv.toFixed(1), prevLtv: +prevLtv.toFixed(1), statusPerpanjangan: status, contractNo: tx.contractNo },
        description: `${tx.customerName}: renewed contract (Top Up) where LTV jumped from ${prevLtv.toFixed(1)}% to ${currentLtv.toFixed(1)}%`,
      });
    }
  }

  return results;
};

/**
 * A05 — Unusual Settlement Pattern (Modified to: Early Settlement for Lunas Tebus only)
 */
const evaluateA05: RuleFunction = (transactions, rule) => {
  const minDays = (rule.thresholds.minSettlementDays as number) || 3;
  const results: RuleEvaluation[] = [];

  for (const tx of transactions) {
    if (tx.eventType !== "SETTLEMENT") continue;
    if (!tx.disbursementDate || !tx.settlementDate) continue;

    const status = tx.settlementStatus ? tx.settlementStatus.trim() : "";
    const lowerStatus = status.toLowerCase();
    
    // Only process "Lunas Tebus" or "Tebus" (exclude renewals / Lelang)
    if (!lowerStatus.includes("tebus") && lowerStatus !== "lunas") continue;

    const disbDate = new Date(tx.disbursementDate);
    const settDate = new Date(tx.settlementDate);
    const diffTime = settDate.getTime() - disbDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays < minDays) {
      results.push({
        triggered: true,
        ruleCode: "A05",
        entityType: "CUSTOMER",
        entityId: tx.customerId,
        entityName: tx.customerName,
        riskScore: Math.min(100, rule.riskWeight * (minDays - diffDays + 1)),
        metadata: { settlementDays: diffDays, disbursementDate: tx.disbursementDate, settlementDate: tx.settlementDate, settlementStatus: status },
        description: `${tx.customerName}: settled/redeemed (${status}) only ${diffDays} day(s) after disbursement (min: ${minDays} days)`,
      });
    }
  }

  return results;
};

/**
 * A06 — Off-Hours Transaction
 * Transaction before 8AM or after 8PM
 */
const evaluateA06: RuleFunction = (transactions, rule) => {
  const startHour = (rule.thresholds.startHour as number) || 8;
  const endHour = (rule.thresholds.endHour as number) || 20;

  return transactions
    .filter(tx => {
      if (!tx.eventTime) return false;
      const hour = parseInt(tx.eventTime.split(":")[0], 10);
      return hour < startHour || hour >= endHour;
    })
    .map(tx => {
      const tzSuffix = tx.timezone ? ` ${tx.timezone}` : "";
      return {
        triggered: true,
        ruleCode: "A06" as AnomalyRuleCode,
        entityType: "CUSTOMER" as RiskEntityType,
        entityId: tx.customerId,
        entityName: tx.customerName,
        riskScore: rule.riskWeight,
        metadata: {
          eventTime: tx.eventTime,
          timezone: tx.timezone,
          officerId: tx.officerId,
          customerId: tx.customerId,
          outletCode: tx.outletCode,
          outletName: tx.outletName,
          contractNo: tx.contractNo,
        },
        description: `Transaction by ${tx.customerName} at ${tx.outletName} at ${tx.eventTime}${tzSuffix} — outside business hours (${startHour}:00-${endHour}:00)`,
      };
    });
};

/**
 * A07 — Cross-Branch Transactions
 * Customer has transactions across different branch locations
 */
const evaluateA07: RuleFunction = (transactions, rule) => {
  const minBranches = (rule.thresholds.minBranches as number) || 2;
  const results: RuleEvaluation[] = [];

  // Group by customer
  const byCustomer = new Map<string, TransactionInput[]>();
  for (const tx of transactions) {
    if (!byCustomer.has(tx.customerId)) byCustomer.set(tx.customerId, []);
    byCustomer.get(tx.customerId)!.push(tx);
  }

  for (const [customerId, txns] of byCustomer) {
    // Get unique outlet codes
    const outlets = Array.from(new Set(txns.map(t => t.outletCode)));
    if (outlets.length >= minBranches) {
      const outletNames = Array.from(new Set(txns.map(t => t.outletName || t.outletCode)));
      const sample = txns[0];
      results.push({
        triggered: true,
        ruleCode: "A07",
        entityType: "CUSTOMER",
        entityId: customerId,
        entityName: sample.customerName,
        riskScore: Math.min(100, rule.riskWeight * (outlets.length - minBranches + 1)),
        metadata: { 
          outletsCount: outlets.length, 
          outletsList: outlets, 
          outletNames 
        },
        description: `${sample.customerName} has transactions across ${outlets.length} different branches: ${outletNames.join(", ")}`,
      });
    }
  }

  return results;
};

// ─── Otomotif Rules ──────────────────────────────────────────────────

/**
 * O01 — Penjualan Meningkat di Akhir Bulan (Indikasi Pending)
 * > 50% penjualan salesman terjadi di 7 hari terakhir bulan tersebut.
 */
const evaluateO01: RuleFunction = (transactions, rule) => {
  const results: RuleEvaluation[] = [];

  // Group by YYYY-MM and Salesforce
  const byMonthSalesman = new Map<string, { total: number; spike: number; salesman: string; monthStr: string; outletCode: string }>();

  for (const tx of transactions) {
    const salesman = tx.rawMetadata?.['Salesforce'];
    if (!salesman) continue;

    const dateStr = tx.eventDate; // YYYY-MM-DD
    if (!dateStr || dateStr.length < 10) continue;

    const monthStr = dateStr.substring(0, 7); // YYYY-MM
    const key = `${monthStr}_${salesman}`;

    if (!byMonthSalesman.has(key)) {
      byMonthSalesman.set(key, { total: 0, spike: 0, salesman, monthStr, outletCode: tx.outletCode });
    }

    const group = byMonthSalesman.get(key)!;
    group.total++;

    // Check if the date is in the last 7 days of the month
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(5, 7));
    const day = parseInt(dateStr.substring(8, 10));
    
    // Get the last day of the month
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    
    if (day > lastDayOfMonth - 7) {
      group.spike++;
    }
  }

  for (const group of byMonthSalesman.values()) {
    if (group.total >= 5) {
      const spikeRatio = group.spike / group.total;
      if (spikeRatio > 0.5) {
        results.push({
          triggered: true,
          ruleCode: "O01",
          entityType: "OFFICER", // Flag the salesman
          entityId: `SALES-${group.salesman}`,
          entityName: group.salesman,
          riskScore: Math.min(100, rule.riskWeight * (spikeRatio / 0.5)),
          metadata: { 
            spikeRatio: (spikeRatio * 100).toFixed(1) + "%", 
            spikeCount: group.spike,
            totalCount: group.total,
            month: group.monthStr,
            outletCode: group.outletCode,
          },
          description: `Indikasi pending sales: ${group.spike} dari ${group.total} unit (${(spikeRatio * 100).toFixed(1)}%) dijual pada 7 hari terakhir bulan ${group.monthStr}.`,
        });
      }
    }
  }

  return results;
};


/**
 * O02 — Dominasi Leasing Tertentu pada Sales
 * > 60% penjualan kredit salesman dikuasai oleh 1 Leasing (Cash/Credit column)
 */
const evaluateO02: RuleFunction = (transactions, rule) => {
  const results: RuleEvaluation[] = [];

  // Group credit sales by Salesforce, then by Leasing
  const salesmanLeasing = new Map<string, { totalCredit: number; leasingCounts: Record<string, number>; outletCode: string }>();

  for (const tx of transactions) {
    const salesman = tx.rawMetadata?.['Salesforce'];
    const cashOrCredit = tx.rawMetadata?.['Cash / Credit'] || '';
    
    // Ignore cash sales or missing data
    if (!salesman || !cashOrCredit || cashOrCredit.toLowerCase() === 'cash') continue;

    if (!salesmanLeasing.has(salesman)) {
      salesmanLeasing.set(salesman, { totalCredit: 0, leasingCounts: {}, outletCode: tx.outletCode });
    }

    const group = salesmanLeasing.get(salesman)!;
    group.totalCredit++;
    group.leasingCounts[cashOrCredit] = (group.leasingCounts[cashOrCredit] || 0) + 1;
  }

  for (const [salesman, group] of salesmanLeasing.entries()) {
    if (group.totalCredit >= 5) {
      // Find the dominant leasing
      let maxLeasing = "";
      let maxCount = 0;
      for (const [leasing, count] of Object.entries(group.leasingCounts)) {
        if (count > maxCount) {
          maxCount = count;
          maxLeasing = leasing;
        }
      }

      const dominanceRatio = maxCount / group.totalCredit;
      if (dominanceRatio > 0.6) {
        results.push({
          triggered: true,
          ruleCode: "O02",
          entityType: "OFFICER",
          entityId: `SALES-${salesman}`,
          entityName: salesman,
          riskScore: Math.min(100, rule.riskWeight * (dominanceRatio / 0.6)),
          metadata: { 
            dominanceRatio: (dominanceRatio * 100).toFixed(1) + "%", 
            leasingName: maxLeasing,
            leasingCount: maxCount,
            totalCredit: group.totalCredit,
            outletCode: group.outletCode,
          },
          description: `Dominasi leasing tidak wajar: ${(dominanceRatio * 100).toFixed(1)}% (${maxCount} dari ${group.totalCredit}) penjualan kredit dikuasai leasing ${maxLeasing}.`,
        });
      }
    }
  }

  return results;
};

/**
 * O04 — Ketimpangan Performance Mekanik
 * Seorang mekanik mendominasi > 50% seluruh transaksi bengkel di cabangnya.
 */
const evaluateO04: RuleFunction = (transactions, rule) => {
  const results: RuleEvaluation[] = [];

  // Filter workshop transactions
  const workshopTx = transactions.filter(t => t.rawMetadata && t.rawMetadata['Workshop Number']);
  
  // Group by Branch Name
  const byBranch = new Map<string, { totalBranch: number; mechanics: Record<string, number>; outletCode: string }>();

  for (const tx of workshopTx) {
    const branchName = tx.rawMetadata?.['Branch Name'] || tx.branchName || 'Unknown Branch';
    const mechanic = tx.rawMetadata?.['Mechanic/Salesman'];
    if (!mechanic) continue;

    if (!byBranch.has(branchName)) {
      byBranch.set(branchName, { totalBranch: 0, mechanics: {}, outletCode: tx.outletCode });
    }

    const group = byBranch.get(branchName)!;
    group.totalBranch++;
    group.mechanics[mechanic] = (group.mechanics[mechanic] || 0) + 1;
  }

  for (const [branch, group] of byBranch.entries()) {
    if (group.totalBranch >= 10) {
      for (const [mechanic, count] of Object.entries(group.mechanics)) {
        const ratio = count / group.totalBranch;
        // Threshold: > 50%
        if (ratio > 0.5) {
          results.push({
            triggered: true,
            ruleCode: "O04",
            entityType: "OFFICER",
            entityId: `MECH-${mechanic}`,
            entityName: mechanic,
            riskScore: Math.min(100, rule.riskWeight * (ratio / 0.5)),
            metadata: {
              workOrderCount: count,
              branchTotal: group.totalBranch,
              ratio: (ratio * 100).toFixed(1) + "%",
              branchName: branch,
              outletCode: group.outletCode,
            },
            description: `Ketimpangan pekerjaan: Mekanik ${mechanic} menangani ${count} dari total ${group.totalBranch} WO (${(ratio * 100).toFixed(1)}%) di cabang ${branch}.`
          });
        }
      }
    }
  }

  return results;
};

/**
 * O05 — Indikasi Fraud (Nama Konsumen Beda Dengan STNK)
 * Jika Salesman memiliki > 3 penjualan dengan nama beda.
 */
const evaluateO05: RuleFunction = (transactions, rule) => {
  const results: RuleEvaluation[] = [];

  const bySalesman = new Map<string, { count: number; outletCode: string }>();

  for (const tx of transactions) {
    const customerName = tx.rawMetadata?.['Customer Name'];
    const stnkName = tx.rawMetadata?.['Nama STNK'];
    const salesman = tx.rawMetadata?.['Salesforce'];

    if (salesman && customerName && stnkName) {
      // Basic string clean-up to match
      const name1 = customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const name2 = stnkName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (name1 !== name2 && name1.length > 0 && name2.length > 0) {
        if (!bySalesman.has(salesman)) {
          bySalesman.set(salesman, { count: 0, outletCode: tx.outletCode });
        }
        bySalesman.get(salesman)!.count++;
      }
    }
  }

  for (const [salesman, group] of bySalesman.entries()) {
    if (group.count >= 3) {
      results.push({
        triggered: true,
        ruleCode: "O05",
        entityType: "OFFICER",
        entityId: `SALES-${salesman}`,
        entityName: salesman,
        riskScore: Math.min(100, rule.riskWeight * (group.count / 3)),
        metadata: {
          mismatchCount: group.count,
          outletCode: group.outletCode,
        },
        description: `Indikasi penipuan identitas: Salesman ${salesman} memiliki ${group.count} transaksi dengan nama konsumen yang tidak sesuai dengan nama di STNK.`
      });
    }
  }

  return results;
};

// ─── Engine Registry ─────────────────────────────────────────────────

const ruleEngines: Partial<Record<AnomalyRuleCode, RuleFunction>> = {
  A01: evaluateA01,
  A02: evaluateA02,
  A03: evaluateA03,
  A04: evaluateA04,
  A05: evaluateA05,
  A06: evaluateA06,
  A07: evaluateA07,
  O01: evaluateO01,
  O02: evaluateO02,
  O04: evaluateO04,
  O05: evaluateO05,
};

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Run all active anomaly rules against a set of transactions.
 */
export function runAnomalyDetection(
  transactions: TransactionInput[],
  rules: AnomalyRule[],
): AnomalyDetection[] {
  const results: AnomalyDetection[] = [];
  let counter = Date.now();

  console.log(`[anomaly-engine] runAnomalyDetection called with ${transactions.length} txns, ${rules.length} rules`);
  if (transactions.length > 0) {
    const s = transactions[0];
    console.log(`[anomaly-engine] Sample tx rawMetadata type: ${typeof s.rawMetadata}, keys: ${s.rawMetadata ? Object.keys(s.rawMetadata).slice(0, 5).join(',') : 'NONE'}`);
    console.log(`[anomaly-engine] Sample Salesforce: ${s.rawMetadata?.['Salesforce']}`);
  }

  for (const rule of rules) {
    if (!rule.isActive) continue;

    const engine = ruleEngines[rule.code];
    if (!engine) {
      console.log(`[anomaly-engine] No engine for rule ${rule.code} — SKIPPING`);
      continue;
    }

    const evaluations = engine(transactions, rule);
    console.log(`[anomaly-engine] Rule ${rule.code}: ${evaluations.length} evaluations, triggered: ${evaluations.filter(e => e.triggered).length}`);

    for (const ev of evaluations) {
      if (!ev.triggered) continue;

      results.push({
        id: `AD-${counter++}`,
        ruleCode: ev.ruleCode,
        ruleName: rule.name,
        sector: rule.sector,
        businessUnitId: (ev.metadata.businessUnitId as string) || "",
        entityType: ev.entityType,
        entityId: ev.entityId,
        entityName: ev.entityName,
        outletCode: ev.metadata.outletCode as string || "",
        outletName: "",
        branchName: "",
        riskScore: Math.round(ev.riskScore),
        riskWeight: rule.riskWeight,
        status: "DETECTED" as AnomalyStatus,
        detectedAt: new Date().toISOString().split("T")[0],
        metadata: ev.metadata,
        description: ev.description,
      });
    }
  }

  return results.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Run a single rule against transactions.
 */
export function runSingleRule(
  transactions: TransactionInput[],
  rule: AnomalyRule,
): RuleEvaluation[] {
  const engine = ruleEngines[rule.code];
  if (!engine) return [];
  return engine(transactions, rule);
}

/**
 * Get rule metadata for display.
 */
export function getRuleDisplayInfo(code: AnomalyRuleCode) {
  const colorMap: Record<string, string> = {
    FREQUENCY: "cyan",
    AMOUNT: "amber",
    PATTERN: "violet",
    TIMING: "blue",
    CONCENTRATION: "rose",
  };

  const iconMap: Record<string, string> = {
    FREQUENCY: "⚡", AMOUNT: "💰", PATTERN: "🔗",
    TIMING: "🕐", CONCENTRATION: "📊",
  };

  return { color: colorMap, icon: iconMap };
}
