/**
 * Risk Scoring Engine
 * Calculates composite risk scores for Customers, Branches, and Officers
 * using weighted anomaly aggregation with velocity and decay factors.
 */

import type {
  AnomalyDetection,
  RiskLevel,
  RiskScoreBreakdown,
  RiskScoreBreakdownItem,
  AnomalyRuleCode,
  CustomerRiskProfile,
  BranchRiskProfile,
  OfficerRiskProfile,
} from "@/types/risk-intelligence";

// ─── Configuration ───────────────────────────────────────────────────

const SCORE_CAP = 100;
const DECAY_HALF_LIFE_DAYS = 90; // Score halves every 90 days
const VELOCITY_WINDOW_DAYS = 30; // Look-back for velocity calculation
const VELOCITY_MULTIPLIER_MAX = 2.0;

// ─── Risk Level Classification ───────────────────────────────────────

export function classifyRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case "CRITICAL": return "#ef4444"; // red-500
    case "HIGH": return "#f59e0b";     // amber-500
    case "MEDIUM": return "#eab308";   // yellow-500
    case "LOW": return "#22c55e";      // green-500
  }
}

export function getRiskLevelBgClass(level: RiskLevel): string {
  switch (level) {
    case "CRITICAL": return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    case "HIGH": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "MEDIUM": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    case "LOW": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  }
}

// ─── Decay Function ──────────────────────────────────────────────────

/**
 * Apply exponential time-decay to a score based on age in days.
 * Newer anomalies carry full weight; older ones decay.
 */
function applyDecay(rawScore: number, daysOld: number): number {
  const decayFactor = Math.pow(0.5, daysOld / DECAY_HALF_LIFE_DAYS);
  return rawScore * decayFactor;
}

/**
 * Calculate the age in days of a detection.
 */
function daysSince(dateStr: string): number {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
}

// ─── Velocity Factor ─────────────────────────────────────────────────

/**
 * Calculate the velocity factor: how rapidly new anomalies are appearing.
 * Higher velocity = higher multiplier (capped at 2.0).
 */
function calculateVelocityFactor(anomalies: AnomalyDetection[]): number {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - VELOCITY_WINDOW_DAYS);

  const recentCount = anomalies.filter(a => new Date(a.detectedAt) >= windowStart).length;
  const olderCount = anomalies.filter(a => new Date(a.detectedAt) < windowStart).length;

  if (olderCount === 0) return recentCount > 0 ? VELOCITY_MULTIPLIER_MAX : 1.0;

  const ratio = recentCount / olderCount;
  return Math.min(VELOCITY_MULTIPLIER_MAX, 1.0 + ratio * 0.5);
}

// ─── Score Breakdown Calculation ─────────────────────────────────────

function buildBreakdown(anomalies: AnomalyDetection[], applyTimeDecay: boolean): RiskScoreBreakdown {
  // Group anomalies by rule
  const byRule = new Map<AnomalyRuleCode, AnomalyDetection[]>();
  for (const a of anomalies) {
    if (!byRule.has(a.ruleCode)) byRule.set(a.ruleCode, []);
    byRule.get(a.ruleCode)!.push(a);
  }

  const items: RiskScoreBreakdownItem[] = [];

  for (const [ruleCode, ruleAnomalies] of byRule) {
    const occurrences = ruleAnomalies.length;
    let weightedScore = ruleAnomalies.reduce((sum, a) => {
      const raw = a.riskWeight * occurrences;
      return sum + (applyTimeDecay ? applyDecay(raw, daysSince(a.detectedAt)) : raw);
    }, 0) / occurrences; // Average per anomaly, then count

    weightedScore = Math.min(SCORE_CAP, weightedScore);

    const sorted = ruleAnomalies.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

    items.push({
      ruleCode,
      ruleName: ruleAnomalies[0].ruleName,
      occurrences,
      weightedScore: Math.round(weightedScore),
      lastDetected: sorted[0].detectedAt,
    });
  }

  const totalRawScore = items.reduce((s, i) => s + i.weightedScore, 0);
  const velocityFactor = calculateVelocityFactor(anomalies);
  const normalizedScore = Math.min(SCORE_CAP, Math.round((totalRawScore * velocityFactor) / Math.max(1, items.length)));

  return {
    items: items.sort((a, b) => b.weightedScore - a.weightedScore),
    totalRawScore: Math.round(totalRawScore),
    normalizedScore,
    velocityFactor: +velocityFactor.toFixed(2),
    decayApplied: applyTimeDecay,
  };
}

// ─── Customer Risk Score ─────────────────────────────────────────────

export function calculateCustomerRiskScore(
  customerId: string,
  customerName: string,
  anomalies: AnomalyDetection[],
  previousScore?: number,
): Pick<CustomerRiskProfile, "totalScore" | "riskLevel" | "breakdown" | "trend" | "trendDirection"> {
  const customerAnomalies = anomalies.filter(
    a => a.entityType === "CUSTOMER" && a.entityId === customerId,
  );

  const breakdown = buildBreakdown(customerAnomalies, true);
  const totalScore = breakdown.normalizedScore;
  const trend = previousScore ? totalScore - previousScore : 0;

  return {
    totalScore,
    riskLevel: classifyRiskLevel(totalScore),
    breakdown,
    trend,
    trendDirection: trend > 3 ? "UP" : trend < -3 ? "DOWN" : "STABLE",
  };
}

// ─── Branch Risk Score ───────────────────────────────────────────────

/**
 * BranchRiskScore = Σ(customerRisks) / branchVolume × anomalyDensityMultiplier
 */
export function calculateBranchRiskScore(
  outletCode: string,
  anomalies: AnomalyDetection[],
  transactionVolume: number,
  previousScore?: number,
): Pick<BranchRiskProfile, "totalScore" | "riskLevel" | "breakdown" | "anomalyDensity" | "trend" | "trendDirection"> {
  const branchAnomalies = anomalies.filter(a => a.outletCode === outletCode);
  const breakdown = buildBreakdown(branchAnomalies, true);

  // Anomaly density = anomalies per 100 transactions
  const anomalyDensity = transactionVolume > 0
    ? +(branchAnomalies.length / transactionVolume * 100).toFixed(1)
    : 0;

  // Apply density multiplier
  const densityMultiplier = 1 + Math.min(1, anomalyDensity / 10);
  const totalScore = Math.min(SCORE_CAP, Math.round(breakdown.normalizedScore * densityMultiplier));
  const trend = previousScore ? totalScore - previousScore : 0;

  return {
    totalScore,
    riskLevel: classifyRiskLevel(totalScore),
    breakdown,
    anomalyDensity,
    trend,
    trendDirection: trend > 3 ? "UP" : trend < -3 ? "DOWN" : "STABLE",
  };
}

// ─── Officer Risk Score ──────────────────────────────────────────────

/**
 * OfficerRiskScore = Σ(handledAnomalies) × supervisoryGapFactor
 */
export function calculateOfficerRiskScore(
  officerId: string,
  anomalies: AnomalyDetection[],
  handledTransactions: number,
  previousScore?: number,
): Pick<OfficerRiskProfile, "totalScore" | "riskLevel" | "breakdown" | "supervisoryGapScore" | "trend" | "trendDirection"> {
  const officerAnomalies = anomalies.filter(
    a => a.entityType === "OFFICER" && a.entityId === officerId,
  );

  const breakdown = buildBreakdown(officerAnomalies, true);

  // Supervisory gap: how many anomalies went unresolved
  const unresolved = officerAnomalies.filter(
    a => a.status === "DETECTED" || a.status === "CONFIRMED",
  );
  const supervisoryGapScore = handledTransactions > 0
    ? Math.min(40, Math.round(unresolved.length / handledTransactions * 1000))
    : 0;

  const totalScore = Math.min(
    SCORE_CAP,
    Math.round(breakdown.normalizedScore * (1 + supervisoryGapScore / 100)),
  );
  const trend = previousScore ? totalScore - previousScore : 0;

  return {
    totalScore,
    riskLevel: classifyRiskLevel(totalScore),
    breakdown,
    supervisoryGapScore,
    trend,
    trendDirection: trend > 3 ? "UP" : trend < -3 ? "DOWN" : "STABLE",
  };
}

// ─── Aggregate Statistics ────────────────────────────────────────────

export function calculateRiskDistribution(
  profiles: Array<{ riskLevel: RiskLevel }>,
): { level: RiskLevel; count: number; percent: number }[] {
  const total = profiles.length || 1;
  const counts: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

  for (const p of profiles) {
    counts[p.riskLevel]++;
  }

  return (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map(level => ({
    level,
    count: counts[level],
    percent: Math.round((counts[level] / total) * 100),
  }));
}

/**
 * Format a number as Indonesian Rupiah.
 */
export function formatIDR(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}Jt`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}Rb`;
  return `Rp ${amount}`;
}
