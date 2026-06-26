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


// ─── Engine Registry ─────────────────────────────────────────────────

const ruleEngines: Partial<Record<AnomalyRuleCode, RuleFunction>> = {
  A01: evaluateA01,
  A02: evaluateA02,
  A03: evaluateA03,
  A04: evaluateA04,
  A05: evaluateA05,
  A06: evaluateA06,
  A07: evaluateA07,
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

  for (const rule of rules) {
    if (!rule.isActive) continue;

    const engine = ruleEngines[rule.code];
    if (!engine) continue;

    const evaluations = engine(transactions, rule);

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
