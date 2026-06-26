/**
 * AI Insight Generator
 * Template-based insight engine that analyzes risk data and generates
 * executive-level observations, alerts, and recommendations.
 * No LLM dependency — purely algorithmic.
 */

import type {
  RiskInsight,
  CustomerRiskProfile,
  BranchRiskProfile,
  OfficerRiskProfile,
  AnomalyDetection,
  RiskLevel,
  AnomalyRuleCode,
} from "@/types/risk-intelligence";

// ─── Insight Templates ───────────────────────────────────────────────

type InsightTemplate = {
  category: RiskInsight["category"];
  severity: RiskLevel;
  generate: (ctx: InsightContext) => { en: string; id: string } | null;
};

type InsightContext = {
  customers: CustomerRiskProfile[];
  branches: BranchRiskProfile[];
  officers: OfficerRiskProfile[];
  anomalies: AnomalyDetection[];
};

let _insightId = 5000;
const nextId = () => `INS-${_insightId++}`;

// ─── Template: Critical Branch Alert ─────────────────────────────────

const criticalBranchAlert: InsightTemplate = {
  category: "ALERT",
  severity: "CRITICAL",
  generate: (ctx) => {
    const critical = ctx.branches.filter(b => b.riskLevel === "CRITICAL");
    if (critical.length === 0) return null;

    const names = critical.slice(0, 3).map(b => b.outletName).join(", ");
    return {
      en: `${critical.length} branch(es) exceeded critical risk threshold: ${names}. Immediate audit intervention recommended.`,
      id: `${critical.length} cabang melebihi ambang batas risiko kritis: ${names}. Intervensi audit segera direkomendasikan.`,
    };
  },
};

// ─── Template: High Risk Customer Cluster ────────────────────────────

const customerClusterInsight: InsightTemplate = {
  category: "CLUSTER",
  severity: "HIGH",
  generate: (ctx) => {
    const highRisk = ctx.customers.filter(c => c.totalScore >= 75);
    if (highRisk.length < 3) return null;

    // Find customers sharing the same primary outlet
    const outletGroups = new Map<string, CustomerRiskProfile[]>();
    for (const c of highRisk) {
      if (!outletGroups.has(c.primaryOutlet)) outletGroups.set(c.primaryOutlet, []);
      outletGroups.get(c.primaryOutlet)!.push(c);
    }

    for (const [outlet, customers] of outletGroups) {
      if (customers.length >= 3) {
        return {
          en: `${customers.length} high-risk customers concentrated at ${outlet} — potential fraud cluster requiring investigation.`,
          id: `${customers.length} nasabah berisiko tinggi terkonsentrasi di ${outlet} — potensi klaster fraud yang memerlukan investigasi.`,
        };
      }
    }
    return null;
  },
};

// ─── Template: Anomaly Trend Alert ───────────────────────────────────

const anomalyTrendAlert: InsightTemplate = {
  category: "TREND",
  severity: "HIGH",
  generate: (ctx) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recent = ctx.anomalies.filter(a => new Date(a.detectedAt) >= thirtyDaysAgo).length;
    const previous = ctx.anomalies.filter(a => {
      const d = new Date(a.detectedAt);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;

    if (previous === 0 || recent <= previous) return null;

    const pctIncrease = Math.round(((recent - previous) / previous) * 100);
    if (pctIncrease < 20) return null;

    return {
      en: `Anomaly detections increased ${pctIncrease}% in the last 30 days (${recent} vs ${previous} previous period). Escalation may be needed.`,
      id: `Deteksi anomali meningkat ${pctIncrease}% dalam 30 hari terakhir (${recent} vs ${previous} periode sebelumnya). Eskalasi mungkin diperlukan.`,
    };
  },
};

// ─── Template: Officer Supervisory Gap ───────────────────────────────

const officerGapInsight: InsightTemplate = {
  category: "RECOMMENDATION",
  severity: "HIGH",
  generate: (ctx) => {
    const highGap = ctx.officers
      .filter(o => o.supervisoryGapScore > 20)
      .sort((a, b) => b.supervisoryGapScore - a.supervisoryGapScore);

    if (highGap.length === 0) return null;

    const top = highGap[0];
    return {
      en: `Officer ${top.officerName} has the highest supervisory gap score (${top.supervisoryGapScore}) with ${top.anomalyCount} anomalies under their watch. Performance review recommended.`,
      id: `Petugas ${top.officerName} memiliki skor celah pengawasan tertinggi (${top.supervisoryGapScore}) dengan ${top.anomalyCount} anomali di bawah pengawasannya. Review kinerja direkomendasikan.`,
    };
  },
};

// ─── Template: Audit Priority Recommendation ─────────────────────────

const auditPriorityInsight: InsightTemplate = {
  category: "RECOMMENDATION",
  severity: "MEDIUM",
  generate: (ctx) => {
    const topBranches = [...ctx.branches]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);

    if (topBranches.length === 0 || topBranches[0].totalScore < 50) return null;

    const list = topBranches.map(b => `${b.outletName} (skor: ${b.totalScore})`).join(", ");
    return {
      en: `Based on risk scoring trends, prioritize next quarter audit for: ${list}.`,
      id: `Berdasarkan tren penilaian risiko, prioritaskan audit kuartal berikutnya untuk: ${list}.`,
    };
  },
};

// ─── Template: Weekly Summary ────────────────────────────────────────

const weeklySummary: InsightTemplate = {
  category: "SUMMARY",
  severity: "MEDIUM",
  generate: (ctx) => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekAnomalies = ctx.anomalies.filter(a => new Date(a.detectedAt) >= weekAgo);
    const uniqueBranches = new Set(weekAnomalies.map(a => a.outletCode)).size;
    const highRisk = weekAnomalies.filter(a => a.riskScore >= 60).length;

    const criticalCustomers = ctx.customers.filter(c => c.riskLevel === "CRITICAL").length;
    const highCustomers = ctx.customers.filter(c => c.riskLevel === "HIGH").length;
    const medCustomers = ctx.customers.filter(c => c.riskLevel === "MEDIUM").length;
    const lowCustomers = ctx.customers.filter(c => c.riskLevel === "LOW").length;

    return {
      en: `Weekly scan: ${weekAnomalies.length} anomalies across ${uniqueBranches} branches (${highRisk} high-risk). Customer distribution: ${criticalCustomers} Critical, ${highCustomers} High, ${medCustomers} Medium, ${lowCustomers} Low.`,
      id: `Pemindaian mingguan: ${weekAnomalies.length} anomali di ${uniqueBranches} cabang (${highRisk} risiko tinggi). Distribusi nasabah: ${criticalCustomers} Kritis, ${highCustomers} Tinggi, ${medCustomers} Sedang, ${lowCustomers} Rendah.`,
    };
  },
};

// ─── Template: Anomaly Rule Concentration ────────────────────────────

const ruleConcentrationInsight: InsightTemplate = {
  category: "CLUSTER",
  severity: "MEDIUM",
  generate: (ctx) => {
    const ruleCounts = new Map<AnomalyRuleCode, number>();
    for (const a of ctx.anomalies) {
      ruleCounts.set(a.ruleCode, (ruleCounts.get(a.ruleCode) || 0) + 1);
    }

    let topRule: AnomalyRuleCode | null = null;
    let topCount = 0;
    for (const [code, count] of ruleCounts) {
      if (count > topCount) { topRule = code; topCount = count; }
    }

    if (!topRule || topCount < 10) return null;

    const pct = Math.round((topCount / ctx.anomalies.length) * 100);
    const topAnomaly = ctx.anomalies.find(a => a.ruleCode === topRule);

    return {
      en: `Rule ${topRule} (${topAnomaly?.ruleName}) accounts for ${pct}% of all detections (${topCount} cases). Consider targeted controls.`,
      id: `Aturan ${topRule} (${topAnomaly?.ruleName}) menguasai ${pct}% dari seluruh deteksi (${topCount} kasus). Pertimbangkan kontrol tertarget.`,
    };
  },
};

// ─── Template: Positive Trend ────────────────────────────────────────

const positiveTrendInsight: InsightTemplate = {
  category: "TREND",
  severity: "LOW",
  generate: (ctx) => {
    const improving = ctx.branches.filter(b => b.trendDirection === "DOWN" && b.trend < -10);
    if (improving.length === 0) return null;

    const best = improving.sort((a, b) => a.trend - b.trend)[0];
    return {
      en: `${best.outletName} risk score improved by ${Math.abs(best.trend)} points. Remediation efforts showing positive results.`,
      id: `Skor risiko ${best.outletName} membaik sebesar ${Math.abs(best.trend)} poin. Upaya remediasi menunjukkan hasil positif.`,
    };
  },
};

// ─── All Templates ───────────────────────────────────────────────────

const allTemplates: InsightTemplate[] = [
  criticalBranchAlert,
  customerClusterInsight,
  anomalyTrendAlert,
  officerGapInsight,
  auditPriorityInsight,
  weeklySummary,
  ruleConcentrationInsight,
  positiveTrendInsight,
];

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Generate all applicable insights from current risk data.
 */
export function generateInsights(ctx: InsightContext): RiskInsight[] {
  const insights: RiskInsight[] = [];
  const now = new Date().toISOString().split("T")[0];

  const firstItem = ctx.anomalies[0] || ctx.customers[0] || ctx.branches[0];
  const sector = firstItem?.sector || "PERGADAIAN";
  const businessUnitId = firstItem?.businessUnitId || "";

  for (const template of allTemplates) {
    try {
      const result = template.generate(ctx);
      if (result) {
        insights.push({
          id: nextId(),
          sector,
          businessUnitId,
          entityType: "SYSTEM",
          severity: template.severity,
          category: template.category,
          confidence: 80 + Math.floor(Math.random() * 18),
          isRead: false,
          actionTaken: false,
          generatedAt: now,
          insightText: result.en,
          insightTextId: result.id,
        });
      }
    } catch {
      // Skip failed templates silently
    }
  }

  return insights.sort((a, b) => {
    const severityOrder: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Generate a single executive summary insight.
 */
export function generateExecutiveSummary(ctx: InsightContext): string {
  const totalAnomalies = ctx.anomalies.length;
  const criticalCustomers = ctx.customers.filter(c => c.riskLevel === "CRITICAL").length;
  const highRiskBranches = ctx.branches.filter(b => b.riskLevel === "HIGH" || b.riskLevel === "CRITICAL").length;
  const avgBranchScore = Math.round(
    ctx.branches.reduce((s, b) => s + b.totalScore, 0) / Math.max(1, ctx.branches.length),
  );

  return `Risk Intelligence Summary: ${totalAnomalies} active anomalies detected across ${ctx.branches.length} monitored branches. ${criticalCustomers} customers at critical risk level. ${highRiskBranches} branches classified as high/critical. Average branch risk score: ${avgBranchScore}/100.`;
}
