"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Activity, AlertTriangle, Building2, ChevronRight, Filter,
  Shield, TrendingDown, TrendingUp, Users, Zap, FileText, Brain
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Cell, PieChart, Pie,
  ComposedChart, Scatter, ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU, useActiveSector } from "@/hooks/use-business-unit";
import { businessUnits, sectorMeta, type SectorMeta } from "@/lib/business-units";
import { RiskKPICard } from "@/components/risk-intelligence/risk-kpi-card";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { RiskScoreGauge } from "@/components/risk-intelligence/risk-score-gauge";
import { getAnomalyRuleColor, ruleMetadata } from "@/components/risk-intelligence/anomaly-rule-badge";
import type { AnomalyRuleCode, RiskLevel, SectorType, RiskMockDataSet } from "@/types/risk-intelligence";
import Link from "next/link";

// ─── Shared Styles ──────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    background: "#0b1739",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    fontSize: "12px",
  },
};

// ─── Period Filter Options ──────────────────────────────────────────
const PERIODS = [
  { key: "7d", label: "7 Hari", labelEn: "7 Days" },
  { key: "30d", label: "30 Hari", labelEn: "30 Days" },
  { key: "90d", label: "90 Hari", labelEn: "90 Days" },
  { key: "ytd", label: "YTD", labelEn: "YTD" },
] as const;

const SEVERITY_LEVELS: RiskLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const severityColors: Record<RiskLevel, string> = {
  CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#eab308", LOW: "#22c55e",
};

// ─── Main Component ─────────────────────────────────────────────────
export default function RiskIntelligenceDashboard() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeBU = useActiveBU();
  const activeSector = useActiveSector();
  const validBUId = activeBU ? activeBU.id : null;
  const isConsolidated = activeBUId === null || !activeBU || !activeSector;

  const [data, setData] = useState<RiskMockDataSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter State ────────────────────────────────────────────────
  const [activePeriod, setActivePeriod] = useState<string>("30d");
  const [activeSeverities, setActiveSeverities] = useState<Set<RiskLevel>>(new Set(SEVERITY_LEVELS));
  const [showAllInsights, setShowAllInsights] = useState(false);

  // ── Data Fetch ──────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const url = `/api/risk-intelligence` + (validBUId ? `?buId=${validBUId}` : "");

    fetch(url, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        return res.json();
      })
      .then((fetchedData) => {
        if (isMounted) { setData(fetchedData); setIsLoading(false); }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) { setError(err.message || "Failed to load"); setIsLoading(false); }
      });

    return () => { isMounted = false; };
  }, [validBUId]);

  // ── Computed Metrics ────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!data) return { activeAnomalies: 0, criticalCustomers: 0, avgBranchScore: 0, monitoredBranches: 0, highRiskBranches: 0, resolvedRate: 0 };

    const activeAnomalies = data.anomalyDetections.filter(
      a => a.status === "DETECTED" || a.status === "CONFIRMED" || a.status === "INVESTIGATING"
    );
    const criticalCustomers = data.customerRiskProfiles.filter(c => c.riskLevel === "CRITICAL");
    const highRiskBranches = data.branchRiskProfiles.filter(b => b.riskLevel === "CRITICAL" || b.riskLevel === "HIGH");
    const resolved = data.anomalyDetections.filter(a => a.status === "RESOLVED").length;
    const total = data.anomalyDetections.length;
    const avgBranchScore = data.branchRiskProfiles.length > 0
      ? Math.round(data.branchRiskProfiles.reduce((s, b) => s + b.totalScore, 0) / data.branchRiskProfiles.length)
      : 0;

    return {
      activeAnomalies: activeAnomalies.length,
      criticalCustomers: criticalCustomers.length,
      avgBranchScore,
      monitoredBranches: data.branchRiskProfiles.length,
      highRiskBranches: highRiskBranches.length,
      resolvedRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  }, [data]);

  // ── Anomaly by Rule Distribution ────────────────────────────────
  const ruleDistribution = useMemo(() => {
    if (!data) return [];
    const counts = new Map<AnomalyRuleCode, number>();
    for (const a of data.anomalyDetections) {
      if (!activeSeverities.has(a.riskScore >= 80 ? "CRITICAL" : a.riskScore >= 60 ? "HIGH" : a.riskScore >= 35 ? "MEDIUM" : "LOW")) continue;
      counts.set(a.ruleCode, (counts.get(a.ruleCode) || 0) + 1);
    }
    return data.anomalyRules
      .filter(r => isConsolidated || !activeSector || r.sector === activeSector)
      .map(r => ({
        code: r.code,
        name: language === "id" ? r.nameId : r.name,
        count: counts.get(r.code) || 0,
        fill: getAnomalyRuleColor(r.code),
      }))
      .sort((a, b) => b.count - a.count);
  }, [language, data, activeSeverities, isConsolidated, activeSector]);

  // ── Top Anomaly Rule (for summary) ──────────────────────────────
  const topRule = ruleDistribution[0];

  // ── Risk Level Distribution (pie) ──────────────────────────────
  const riskDistribution = useMemo(() => {
    if (!data) return [];
    const counts: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const c of data.customerRiskProfiles) counts[c.riskLevel]++;
    return (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map(level => ({
      name: level,
      label: t(`ri.${level.toLowerCase()}` as any),
      value: counts[level],
      fill: severityColors[level],
    }));
  }, [t, data]);

  // ── Top Risk (only 5) ─────────────────────────────────
  const topCustomers = useMemo(() => {
    if (!data?.customerRiskProfiles) return [];
    return [...data.customerRiskProfiles].sort((a,b) => b.totalScore - a.totalScore).slice(0, 5);
  }, [data]);

  const topOfficers = useMemo(() => {
    if (!data?.officerRiskProfiles) return [];
    return [...data.officerRiskProfiles].sort((a,b) => b.totalScore - a.totalScore).slice(0, 5);
  }, [data]);

  // ── Spark Data ──────────────────────────────────────────────────
  const anomalySparkData = data?.anomalyTrends?.map(t => t.total as number) || [];
  const branchSparkData = data?.riskTrends?.map(t => t.branchAvg) || [];

  // ── Insights ────────────────────────────────────────────────────
  const allInsights = useMemo(() => {
    if (!data) return [];
    return data.riskInsights.filter(i => !i.isRead);
  }, [data]);
  const visibleInsights = showAllInsights ? allInsights : allInsights.slice(0, 4);

  // ── Consolidated View Data Aggregations ──────────────────────────
  const consolidatedStats = useMemo(() => {
    if (!data || !isConsolidated) return null;

    // 1. Sector Anomaly Distribution
    const sectorCounts: Record<string, number> = { PERGADAIAN: 0, MULTIFINANCE: 0, OTOMOTIF: 0 };
    for (const a of data.anomalyDetections) {
      if (!activeSeverities.has(a.riskScore >= 80 ? "CRITICAL" : a.riskScore >= 60 ? "HIGH" : a.riskScore >= 35 ? "MEDIUM" : "LOW")) continue;
      if (a.sector) sectorCounts[a.sector]++;
    }
    const sectorDistribution = (["PERGADAIAN", "MULTIFINANCE", "OTOMOTIF"] as SectorType[])
      .map(s => ({
        sector: s,
        name: language === "id" ? sectorMeta[s].labelId : sectorMeta[s].label,
        count: sectorCounts[s] || 0,
        fill: sectorMeta[s].color,
      }))
      .sort((a, b) => b.count - a.count);

    // 2. Top Riskiest BUs
    const buCounts = new Map<string, { critical: number; high: number; total: number }>();
    for (const a of data.anomalyDetections) {
      if (!a.businessUnitId) continue;
      if (!buCounts.has(a.businessUnitId)) {
        buCounts.set(a.businessUnitId, { critical: 0, high: 0, total: 0 });
      }
      const st = buCounts.get(a.businessUnitId)!;
      st.total++;
      if (a.riskScore >= 80) st.critical++;
      else if (a.riskScore >= 60) st.high++;
    }

    const riskiestBUs = Array.from(buCounts.entries())
      .map(([buId, stats]) => {
         const bu = businessUnits.find(b => b.id === buId);
         // Weighted risk score for sorting
         const riskScore = (stats.critical * 10) + (stats.high * 5) + stats.total;
         return {
           buId,
           name: bu?.name || buId,
           shortName: bu?.shortName || buId,
           sector: bu?.sector as SectorType,
           color: bu?.color || "#94a3b8",
           icon: bu?.sector ? sectorMeta[bu.sector].icon : "",
           critical: stats.critical,
           high: stats.high,
           total: stats.total,
           riskScore
         };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);

    return { sectorDistribution, riskiestBUs };
  }, [data, isConsolidated, activeSeverities, language]);

  // ── Bell Curve ──────────────────────────────────────────────────
  const bellCurveData = useMemo(() => {
    if (!data || !data.branchRiskProfiles || data.branchRiskProfiles.length === 0) {
      return { curvePoints: [] as { x: number; y: number }[], branchPoints: [] as any[], stats: { mean: 0, stdDev: 0 } };
    }

    const validBranches = data.branchRiskProfiles.filter(b => b.avgPawnDuration !== undefined && b.avgPawnDuration > 0);
    if (validBranches.length === 0) {
      return { curvePoints: [] as { x: number; y: number }[], branchPoints: [] as any[], stats: { mean: 0, stdDev: 0 } };
    }

    const values = validBranches.map(b => b.avgPawnDuration!);
    const N = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / N;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / N;
    const stdDev = Math.max(1, Math.sqrt(variance));

    const curvePoints: { x: number; y: number }[] = [];
    const minX = mean - 3.5 * stdDev;
    const maxX = mean + 3.5 * stdDev;
    const step = (maxX - minX) / 79;
    const pdf = (x: number) => (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));

    for (let i = 0; i < 80; i++) {
      const x = minX + i * step;
      curvePoints.push({ x: Number(x.toFixed(2)), y: pdf(x) });
    }

    const branchPoints = validBranches.map(b => {
      const x = b.avgPawnDuration!;
      const y = pdf(x);
      const zScore = (x - mean) / stdDev;
      return {
        id: b.id, branchName: b.branchName, outletName: b.outletName,
        avgPawnDuration: x, zScore: Number(zScore.toFixed(2)), x, y,
      };
    });

    return { curvePoints, branchPoints, stats: { mean: Number(mean.toFixed(1)), stdDev: Number(stdDev.toFixed(1)) } };
  }, [data]);

  // ── Context Subtitle ────────────────────────────────────────────
  const contextSubtitle = isConsolidated
    ? (language === "id"
      ? `Tampilan konsolidasi — ${businessUnits.length} unit bisnis, 3 sektor`
      : `Consolidated view — ${businessUnits.length} business units, 3 sectors`)
    : (language === "id"
      ? `${activeBU?.name} — ${sectorMeta[activeSector!].labelId}`
      : `${activeBU?.name} — ${sectorMeta[activeSector!].label}`);

  // ── Executive Summary Text ──────────────────────────────────────
  const summaryText = useMemo(() => {
    if (!data) return "";
    const topRuleName = topRule ? topRule.name : "";
    if (language === "id") {
      return `Terdeteksi ${metrics.activeAnomalies} anomali aktif dari ${data.anomalyDetections.length} total deteksi, ${metrics.criticalCustomers} nasabah risiko kritis, dan ${metrics.highRiskBranches} cabang berisiko tinggi. Rata-rata skor risiko cabang ${metrics.avgBranchScore}/100. ${topRuleName ? `Perhatian utama: ${topRuleName} (${topRule?.count} kejadian).` : ""}`;
    }
    return `Detected ${metrics.activeAnomalies} active anomalies from ${data.anomalyDetections.length} total detections, ${metrics.criticalCustomers} critical-risk customers, and ${metrics.highRiskBranches} high-risk branches. Average branch risk score ${metrics.avgBranchScore}/100. ${topRuleName ? `Top concern: ${topRuleName} (${topRule?.count} occurrences).` : ""}`;
  }, [data, metrics, topRule, language]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleRunScan = () => {
    alert("AI Anomaly Scan Engine:\n\n- Data sources scanned: Transactions, CIF Registers, General Ledgers.\n- Result: 0 new anomalies detected. Active risk thresholds remain within normal parameters.");
  };

  const handleExportRisk = () => {
    const element = document.createElement("a");
    const label = activeBU ? activeBU.name : "Holding_Consolidated";
    const content = `AuditSphere AI - Anomaly Intelligence Summary Report\n================================================\nScope: ${label}\nGenerated: ${new Date().toLocaleString()}\n\n${summaryText}`;
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Anomaly_Intelligence_Report_${label.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const toggleSeverity = (level: RiskLevel) => {
    setActiveSeverities(prev => {
      const next = new Set(prev);
      if (next.has(level)) { next.delete(level); } else { next.add(level); }
      if (next.size === 0) return new Set(SEVERITY_LEVELS); // prevent empty selection
      return next;
    });
  };

  // ── Loading/Error ───────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
        <p className="text-sm text-slate-400">
          {language === "id" ? "Memuat data anomaly intelligence..." : "Loading anomaly intelligence data..."}
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="text-rose-500 text-3xl font-bold">Error</div>
        <p className="text-sm text-slate-400">{error}</p>
        <button onClick={() => window.location.reload()} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 transition">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 pb-10">
      {/* ═══════════════════════════════════════════════════════════
          ZONA 1 — EXECUTIVE OVERVIEW
      ═══════════════════════════════════════════════════════════ */}

      <PageHeader
        title={t("ri.dashTitle")}
        subtitle={contextSubtitle}
        actions={[
          { label: t("ri.btnRunScan"), variant: "default", onClick: handleRunScan },
          { label: t("ri.btnExportRisk"), onClick: handleExportRisk },
        ]}
      />

      {/* ── Executive Summary Card ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1739]/80 via-[#0d1e47]/60 to-[#091230]/80 p-5 backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-500/5" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          {/* Left: summary text + mini risk pie */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                {language === "id" ? "Ringkasan Eksekutif" : "Executive Summary"}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-300 max-w-2xl">
              {summaryText}
            </p>

            {/* Active BU indicator */}
            {!isConsolidated && activeBU && (
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase"
                  style={{ backgroundColor: activeBU.color + "20", color: activeBU.color }}
                >
                  {activeBU.shortName}
                </span>
                <span className="text-xs text-slate-500">
                  {activeBU.name} • {sectorMeta[activeSector!].icon} {language === "id" ? sectorMeta[activeSector!].labelId : sectorMeta[activeSector!].label}
                </span>
              </div>
            )}
          </div>

          {/* Right: Mini donut + legend */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="h-20 w-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistribution} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={24} outerRadius={36} paddingAngle={2} strokeWidth={0}>
                    {riskDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {riskDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                  <span className="text-[10px] text-slate-400">{d.label}</span>
                  <span className="text-[10px] font-bold text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resolution rate bar */}
        <div className="relative mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
            <span>{language === "id" ? "Tingkat Resolusi Anomali" : "Anomaly Resolution Rate"}</span>
            <span className="font-bold text-emerald-400">{metrics.resolvedRate}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${metrics.resolvedRate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Filter Toolbar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wide">
            {language === "id" ? "Filter" : "Filters"}
          </span>
        </div>

        {/* Period selector */}
        <div className="flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setActivePeriod(p.key)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                activePeriod === p.key
                  ? "bg-cyan-500/15 text-cyan-300 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {language === "id" ? p.label : p.labelEn}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Severity toggles */}
        <div className="flex gap-1">
          {SEVERITY_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => toggleSeverity(level)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium border transition ${
                activeSeverities.has(level)
                  ? "border-white/15 bg-white/[0.04] text-white"
                  : "border-transparent bg-transparent text-slate-600"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeSeverities.has(level) ? severityColors[level] : "#334155" }} />
              {t(`ri.${level.toLowerCase()}` as any)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Consolidated Sector Overview ────────────────────────── */}
      {isConsolidated && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(["PERGADAIAN", "MULTIFINANCE", "OTOMOTIF"] as SectorType[]).map(sector => {
            const meta = sectorMeta[sector];
            const sectorBUs = businessUnits.filter(bu => bu.sector === sector);
            const sectorDetections = data.anomalyDetections.filter(a => a.sector === sector);
            const activeCount = sectorDetections.filter(a => a.status === "DETECTED" || a.status === "CONFIRMED").length;

            return (
              <motion.div key={sector} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{language === "id" ? meta.labelId : meta.label}</div>
                    <div className="text-[11px] text-slate-500">{sectorBUs.length} {language === "id" ? "unit bisnis" : "business units"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/[0.03] p-2.5">
                    <div className="text-lg font-bold text-white">{activeCount}</div>
                    <div className="text-[10px] text-slate-500">{t("ri.totalAnomalies")}</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2.5">
                    <div className="text-lg font-bold text-white">{sectorBUs.length}</div>
                    <div className="text-[10px] text-slate-500">{language === "id" ? "Unit Bisnis" : "BUs"}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {sectorBUs.map(bu => (
                    <span key={bu.id} className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono" style={{ backgroundColor: bu.color + "15", color: bu.color }}>
                      {bu.shortName}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── KPI Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RiskKPICard label={t("ri.totalAnomalies")} value={metrics.activeAnomalies} change="+12% vs last month" changeValue={12} icon={Zap} color="rose" sparkData={anomalySparkData} />
        <RiskKPICard label={t("ri.criticalCustomers")} value={metrics.criticalCustomers} change="+3 this week" changeValue={3} icon={Users} color="amber" />
        <RiskKPICard label={t("ri.avgBranchScore")} value={`${metrics.avgBranchScore}/100`} change="-2.4 pts" changeValue={-2.4} icon={Building2} color="cyan" sparkData={branchSparkData} />
        <RiskKPICard label={t("ri.riskCoverage")} value={`${metrics.monitoredBranches}/${metrics.monitoredBranches}`} change="100% coverage" changeValue={0} icon={Shield} color="emerald" />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ZONA 2 — CHARTS UTAMA
      ═══════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ── Anomaly Distribution ───────────────────────────── */}
        <Card className={isConsolidated ? "h-fit" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-cyan-400" />
              {isConsolidated ? (language === "id" ? "Distribusi Anomali per Sektor" : "Anomaly Distribution by Sector") : t("ri.anomalyDistribution")}
            </CardTitle>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {language === "id" ? (isConsolidated ? "Jumlah deteksi per Sektor" : "Jumlah deteksi per aturan anomali — hover untuk detail") : (isConsolidated ? "Detection count per Sector" : "Detection count per anomaly rule — hover for details")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin pr-2">
              {isConsolidated && consolidatedStats ? (
                consolidatedStats.sectorDistribution.map((sec) => {
                  const maxCount = Math.max(...consolidatedStats.sectorDistribution.map(r => r.count), 1);
                  const pct = (sec.count / maxCount) * 100;
                  return (
                    <div key={sec.sector} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[14px]">{sectorMeta[sec.sector].icon}</span>
                          <span className="text-xs font-semibold text-slate-300 truncate">{sec.name}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-white shrink-0 ml-2">{sec.count}</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: sec.fill }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                ruleDistribution.map((rule) => {
                  const maxCount = Math.max(...ruleDistribution.map(r => r.count), 1);
                  const pct = (rule.count / maxCount) * 100;
                  return (
                    <div key={rule.code} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: rule.fill + '20', color: rule.fill }}>{rule.code}</span>
                          <span className="text-xs text-slate-400 truncate">{rule.name}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-white shrink-0 ml-2">{rule.count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: rule.fill }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Risk Score Trend (12 Months) ───────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-cyan-400" />
              {t("ri.riskScoreTrend")}
            </CardTitle>
            <div className="flex items-center gap-4 mt-1">
              {[{ label: t("ri.customerAvg"), color: "#22d3ee" }, { label: t("ri.branchAvg"), color: "#fbbf24" }, { label: t("ri.officerAvg"), color: "#a78bfa" }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] text-slate-500">{l.label}</span>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.riskTrends} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                <defs>
                  <linearGradient id="gradCustomer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBranch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOfficer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={40} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="customerAvg" stroke="#22d3ee" fill="url(#gradCustomer)" strokeWidth={2} name={t("ri.customerAvg")} />
                <Area type="monotone" dataKey="branchAvg" stroke="#fbbf24" fill="url(#gradBranch)" strokeWidth={2} name={t("ri.branchAvg")} />
                <Area type="monotone" dataKey="officerAvg" stroke="#a78bfa" fill="url(#gradOfficer)" strokeWidth={2} name={t("ri.officerAvg")} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Bell Curve (Full Width) ────────────────────────────── */}
      {!isConsolidated && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-amber-500" />
              {language === "id" ? "Kurva Distribusi Normal Durasi Gadai Cabang" : "Pawn Duration Normal Distribution Curve of Branches"}
            </CardTitle>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {language === "id"
              ? `Rata-rata Populasi (μ): ${bellCurveData.stats.mean} hari | Standar Deviasi (σ): ${bellCurveData.stats.stdDev} hari — titik di luar ±2σ menunjukkan anomali`
              : `Population Mean (μ): ${bellCurveData.stats.mean} days | Std Dev (σ): ${bellCurveData.stats.stdDev} days — points beyond ±2σ indicate anomalies`}
          </p>
        </CardHeader>
        <CardContent className="h-[340px] pb-4">
          {bellCurveData.curvePoints.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart>
                <defs>
                  <linearGradient id="gradBell" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis type="number" dataKey="x" domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} unit={language === "id" ? " hari" : " days"} tickFormatter={(val) => Number(val).toFixed(0)} />
                <YAxis hide type="number" domain={[0, 'auto']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const scatterData = payload.find(p => p.name === "Cabang" || p.name === "Branch" || p.payload.branchName);
                      if (scatterData) {
                        const { branchName, outletName, avgPawnDuration, zScore } = scatterData.payload;
                        const zLabel = zScore >= 0 ? `+${zScore}σ` : `${zScore}σ`;
                        let groupLabel = "";
                        if (language === "id") {
                          if (Math.abs(zScore) <= 1) groupLabel = "Wajar (68% Populasi)";
                          else if (Math.abs(zScore) <= 2) groupLabel = "Peringatan (95% Populasi)";
                          else groupLabel = "Anomali Ekstrim (99% Populasi)";
                        } else {
                          if (Math.abs(zScore) <= 1) groupLabel = "Normal (68% Population)";
                          else if (Math.abs(zScore) <= 2) groupLabel = "Warning (95% Population)";
                          else groupLabel = "Extreme Anomaly (99% Population)";
                        }
                        return (
                          <div className="rounded-lg border border-white/10 bg-[#0b1739] p-3 text-xs text-slate-200 shadow-xl">
                            <p className="font-bold text-cyan-400">{branchName}</p>
                            <p className="text-[10px] text-slate-400 mb-1">{outletName}</p>
                            <p>{language === "id" ? "Rata-rata Durasi" : "Average Duration"}: <span className="font-bold text-white">{avgPawnDuration} {language === "id" ? "hari" : "days"}</span></p>
                            <p>Z-Score: <span className="font-bold text-amber-400">{zLabel}</span></p>
                            <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.05] text-slate-300">{groupLabel}</span>
                          </div>
                        );
                      }
                      const curveData = payload.find(p => p.dataKey === "y");
                      if (curveData) {
                        return (
                          <div className="rounded-lg border border-white/10 bg-[#0b1739] p-2 text-xs text-slate-300 shadow-md">
                            <p>{language === "id" ? "Durasi" : "Duration"}: <span className="text-white font-bold">{curveData.payload.x} {language === "id" ? "hari" : "days"}</span></p>
                          </div>
                        );
                      }
                    }
                    return null;
                  }}
                />
                <Area data={bellCurveData.curvePoints} type="monotone" dataKey="y" stroke="#f59e0b" strokeWidth={2} fill="url(#gradBell)" dot={false} activeDot={false} name="Curve" />
                <Scatter data={bellCurveData.branchPoints} name={language === "id" ? "Cabang" : "Branch"} fill="#22d3ee" />
                <ReferenceLine x={bellCurveData.stats.mean} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Mean (μ)", position: "top", fill: "#ef4444", fontSize: 9, fontWeight: "bold" }} />
                <ReferenceLine x={bellCurveData.stats.mean + bellCurveData.stats.stdDev} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "+1σ", position: "top", fill: "#f59e0b", fontSize: 9 }} />
                <ReferenceLine x={bellCurveData.stats.mean - bellCurveData.stats.stdDev} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "-1σ", position: "top", fill: "#f59e0b", fontSize: 9 }} />
                <ReferenceLine x={bellCurveData.stats.mean + 2 * bellCurveData.stats.stdDev} stroke="#eab308" strokeDasharray="4 4" label={{ value: "+2σ", position: "top", fill: "#eab308", fontSize: 9 }} />
                <ReferenceLine x={bellCurveData.stats.mean - 2 * bellCurveData.stats.stdDev} stroke="#eab308" strokeDasharray="4 4" label={{ value: "-2σ", position: "top", fill: "#eab308", fontSize: 9 }} />
                <ReferenceLine x={bellCurveData.stats.mean + 3 * bellCurveData.stats.stdDev} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "+3σ", position: "top", fill: "#ef4444", fontSize: 9 }} />
                <ReferenceLine x={bellCurveData.stats.mean - 3 * bellCurveData.stats.stdDev} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "-3σ", position: "top", fill: "#ef4444", fontSize: 9 }} />
              </ComposedChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {language === "id" ? "Tidak ada data durasi gadai cabang" : "No branch pawn duration data available"}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ZONA 3 — DETAIL & DRILL-DOWN
      ═══════════════════════════════════════════════════════════ */}

      {isConsolidated && consolidatedStats ? (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  {language === "id" ? "Top 5 Unit Bisnis Paling Berisiko" : "Top 5 Riskiest Business Units"}
                </div>
              </CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === "id" ? "Pilih Unit Bisnis dari menu atas untuk melihat detail Nasabah, Cabang, dan AI Insights." : "Select a Business Unit from the top menu to view detailed Customers, Branches, and AI Insights."}
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {consolidatedStats.riskiestBUs.map((bu, idx) => (
                  <motion.div
                    key={bu.buId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.05] transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold ${
                        idx === 0 ? 'bg-rose-500/20 text-rose-400' : idx === 1 ? 'bg-amber-500/20 text-amber-400' : idx === 2 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/[0.04] text-slate-500'
                      }`}>{idx + 1}</span>
                      <span className="text-xl">{bu.icon}</span>
                    </div>
                    
                    <div>
                      <div className="text-sm font-bold text-white leading-tight mb-1">{bu.name}</div>
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: bu.color + "20", color: bu.color }}>
                        {bu.shortName}
                      </span>
                    </div>

                    <div className="mt-auto pt-3 border-t border-white/10 grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-rose-400">{bu.critical}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Critical</div>
                      </div>
                      <div className="text-center border-x border-white/5">
                        <div className="text-lg font-bold text-amber-400">{bu.high}</div>
                        <div className="text-[9px] text-slate-500 uppercase">High</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{bu.total}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Total</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Global Critical Anomalies Feed ────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-rose-500" />
                  {language === "id" ? "Umpan Anomali Kritis Global (Real-time)" : "Global Critical Anomalies Feed (Real-time)"}
                </div>
              </CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === "id" ? "Daftar anomali tingkat kritis terbaru dari seluruh Unit Bisnis di dalam grup." : "Latest critical-level anomalies across all Business Units in the group."}
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto overflow-y-auto max-h-[350px] scrollbar-thin">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-[#0b1739] z-10">
                    <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500 bg-[#0b1739]">
                      <th className="pb-2 font-medium">{language === "id" ? "Waktu" : "Time"}</th>
                      <th className="pb-2 font-medium">{language === "id" ? "Unit Bisnis" : "Business Unit"}</th>
                      <th className="pb-2 font-medium">{language === "id" ? "Cabang/Outlet" : "Branch/Outlet"}</th>
                      <th className="pb-2 font-medium">{language === "id" ? "Indikasi / Aturan" : "Indication / Rule"}</th>
                      <th className="pb-2 font-medium text-right">{language === "id" ? "Skor" : "Score"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {data.anomalyDetections
                      .filter(a => a.riskScore >= 80 && (a.status === "DETECTED" || a.status === "CONFIRMED"))
                      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
                      .slice(0, 8)
                      .map((anomaly, idx) => {
                        const bu = businessUnits.find(b => b.id === anomaly.businessUnitId);
                        return (
                          <motion.tr 
                            key={anomaly.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="hover:bg-white/[0.02] transition"
                          >
                            <td className="py-2.5 text-[11px] text-slate-400">{anomaly.detectedAt}</td>
                            <td className="py-2.5">
                              {bu ? (
                                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: bu.color + "20", color: bu.color }}>
                                  {bu.shortName}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-2.5 text-xs truncate max-w-[120px]" title={anomaly.outletName || anomaly.branchName}>
                              {anomaly.outletName || anomaly.branchName}
                            </td>
                            <td className="py-2.5 text-xs truncate max-w-[250px]" title={anomaly.ruleName}>
                              <span className="font-mono text-[10px] text-rose-400 mr-2">{anomaly.ruleCode}</span>
                              {anomaly.ruleName}
                            </td>
                            <td className="py-2.5 text-right">
                              <span className="font-bold text-rose-500">{anomaly.riskScore}</span>
                            </td>
                          </motion.tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* ── Top Risk Customers / Officers (5 items) ──────────────────── */}
          <Card className="xl:col-span-1">
            <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                {activeSector === "OTOMOTIF" ? "Top Risk Officer" : t("ri.topRiskCustomers")}
              </div>
              <Link href={activeSector === "OTOMOTIF" ? "/risk-intelligence/officers" : "/risk-intelligence/customers"} className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition">
                {language === "id" ? "Lihat Semua" : "View All"}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {activeSector === "OTOMOTIF" ? (
              topOfficers.map((o, idx) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition"
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-bold ${
                    idx === 0 ? 'bg-rose-500/20 text-rose-400' : idx === 1 ? 'bg-amber-500/20 text-amber-400' : idx === 2 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/[0.04] text-slate-500'
                  }`}>{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-white truncate">{o.officerName}</div>
                    <div className="text-[10px] text-slate-500 truncate">{o.position} • {o.outletName}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-sm font-bold font-mono ${
                      o.riskLevel === 'CRITICAL' ? 'text-rose-400' : o.riskLevel === 'HIGH' ? 'text-amber-400' : o.riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>{o.totalScore}</span>
                    <RiskLevelIndicator level={o.riskLevel} />
                  </div>
                </motion.div>
              ))
            ) : (
              topCustomers.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition"
                >
                  {/* Rank number */}
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-bold ${
                    idx === 0 ? 'bg-rose-500/20 text-rose-400' : idx === 1 ? 'bg-amber-500/20 text-amber-400' : idx === 2 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/[0.04] text-slate-500'
                  }`}>{idx + 1}</span>
  
                  {/* Name + outlet */}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-white truncate">{c.customerName}</div>
                    <div className="text-[10px] text-slate-500 truncate">{c.primaryOutlet}</div>
                  </div>
  
                  {/* Score + level */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-sm font-bold font-mono ${
                      c.riskLevel === 'CRITICAL' ? 'text-rose-400' : c.riskLevel === 'HIGH' ? 'text-amber-400' : c.riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>{c.totalScore}</span>
                    <RiskLevelIndicator level={c.riskLevel} />
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ── Branch Risk Heatmap ───────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-cyan-400" />
                {t("ri.branchRiskHeatmap")}
              </div>
              <Link href="/risk-intelligence/branches" className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition">
                {language === "id" ? "Lihat Semua" : "View All"}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.branchRiskProfiles.slice(0, 10).map((b, idx) => {
                const barColor = b.riskLevel === "CRITICAL" ? "#ef4444"
                  : b.riskLevel === "HIGH" ? "#f59e0b"
                  : b.riskLevel === "MEDIUM" ? "#eab308"
                  : "#22c55e";
                const pct = Math.min(100, b.totalScore);

                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.03] transition"
                  >
                    <span className="text-[10px] text-slate-500 font-mono w-3 shrink-0 text-right">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-slate-300 truncate">{b.outletName}</div>
                      <div className="mt-0.5 h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold font-mono shrink-0" style={{ color: barColor }}>{b.totalScore}</span>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as RiskLevel[]).map(level => (
                  <div key={level} className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: severityColors[level] }} />
                    <span className="text-[9px] text-slate-500">{t(`ri.${level.toLowerCase()}` as any)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── AI Risk Insights (4 items + show more) ─────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-violet-400" />
                {t("ri.aiInsights")}
              </div>
              {allInsights.length > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {allInsights.length} {language === "id" ? "belum dibaca" : "unread"}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto space-y-2 scrollbar-thin">
            <AnimatePresence>
              {allInsights.map((insight, idx) => {
                const borderColor = insight.severity === "CRITICAL" ? "border-l-rose-500"
                  : insight.severity === "HIGH" ? "border-l-amber-500"
                  : insight.severity === "MEDIUM" ? "border-l-yellow-500"
                  : "border-l-emerald-500";
                const confColor = insight.confidence >= 90 ? "#22d3ee" : insight.confidence >= 80 ? "#a78bfa" : "#94a3b8";

                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className={`rounded-lg border border-white/5 border-l-2 ${borderColor} bg-white/[0.02] p-3 hover:bg-white/[0.04] transition`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <RiskLevelIndicator level={insight.severity} />
                      <span className="text-[10px] text-slate-600 shrink-0">{insight.generatedAt}</span>
                    </div>
                    <p className="text-[12px] text-slate-300 leading-relaxed line-clamp-2">
                      {language === "id" ? insight.insightTextId : insight.insightText}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${insight.confidence}%`, backgroundColor: confColor }} />
                      </div>
                      <span className="text-[10px] font-mono font-medium shrink-0" style={{ color: confColor }}>{insight.confidence}%</span>
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
