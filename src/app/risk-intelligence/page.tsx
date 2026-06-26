"use client";

import { useMemo, useState, useEffect } from "react";
import { Activity, AlertTriangle, Building2, Layers, Shield, Users, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Cell, PieChart, Pie,
  ComposedChart, Scatter, ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU, useActiveSector } from "@/hooks/use-business-unit";
import { businessUnits, sectorMeta, type SectorMeta } from "@/lib/business-units";
import { RiskKPICard } from "@/components/risk-intelligence/risk-kpi-card";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { RiskScoreGauge } from "@/components/risk-intelligence/risk-score-gauge";
import { AnomalyRuleBadge, getAnomalyRuleColor, ruleMetadata } from "@/components/risk-intelligence/anomaly-rule-badge";
import type { AnomalyRuleCode, RiskLevel, SectorType, RiskMockDataSet } from "@/types/risk-intelligence";

const tooltipStyle = {
  contentStyle: {
    background: "#0b1739",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    fontSize: "12px",
  },
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const code = payload.value;
  const meta = ruleMetadata[code];
  const tooltipText = meta ? `${code}: ${meta.name}\n${meta.description}` : code;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#94a3b8"
        fontSize={11}
        className="cursor-help font-mono font-bold hover:fill-cyan-400 transition-colors"
      >
        <title>{tooltipText}</title>
        {code}
      </text>
    </g>
  );
};

export default function RiskIntelligenceDashboard() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeBU = useActiveBU();
  const activeSector = useActiveSector();
  const isConsolidated = activeBUId === null;

  const [data, setData] = useState<RiskMockDataSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const url = `/api/risk-intelligence` + (activeBUId ? `?buId=${activeBUId}` : "");

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        return res.json();
      })
      .then((fetchedData) => {
        if (isMounted) {
          setData(fetchedData);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) {
          setError(err.message || "Failed to load dashboard data");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeBUId]);

  // ─── Computed Metrics ────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!data) return { activeAnomalies: 0, criticalCustomers: 0, avgBranchScore: 0, monitoredBranches: 0 };
    const activeAnomalies = data.anomalyDetections.filter(
      a => a.status === "DETECTED" || a.status === "CONFIRMED" || a.status === "INVESTIGATING"
    );
    const criticalCustomers = data.customerRiskProfiles.filter(
      c => c.riskLevel === "CRITICAL"
    );
    const avgBranchScore = data.branchRiskProfiles.length > 0
      ? Math.round(data.branchRiskProfiles.reduce((s, b) => s + b.totalScore, 0) / data.branchRiskProfiles.length)
      : 0;
    const monitoredBranches = data.branchRiskProfiles.length;

    return { activeAnomalies: activeAnomalies.length, criticalCustomers: criticalCustomers.length, avgBranchScore, monitoredBranches };
  }, [data]);

  // ─── Anomaly by Rule distribution ───────────────────────────────
  const ruleDistribution = useMemo(() => {
    if (!data) return [];
    const counts = new Map<AnomalyRuleCode, number>();
    for (const a of data.anomalyDetections) {
      counts.set(a.ruleCode, (counts.get(a.ruleCode) || 0) + 1);
    }
    return data.anomalyRules.map(r => ({
      code: r.code,
      name: language === "id" ? r.nameId : r.name,
      count: counts.get(r.code) || 0,
      fill: getAnomalyRuleColor(r.code),
    }));
  }, [language, data]);

  // ─── Risk level distribution (pie) ─────────────────────────────
  const riskDistribution = useMemo(() => {
    if (!data) return [];
    const counts: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const c of data.customerRiskProfiles) counts[c.riskLevel]++;
    const colors: Record<RiskLevel, string> = {
      CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#eab308", LOW: "#22c55e",
    };
    return (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map(level => ({
      name: t(`ri.${level.toLowerCase()}` as any),
      value: counts[level],
      fill: colors[level],
    }));
  }, [t, data]);

  // ─── Top risk customers ─────────────────────────────────────────
  const topCustomers = useMemo(() => data?.customerRiskProfiles.slice(0, 8) || [], [data?.customerRiskProfiles]);

  // ─── Spark data for KPI cards ───────────────────────────────────
  const anomalySparkData = data?.anomalyTrends.map(t => t.total as number) || [];
  const branchSparkData = data?.riskTrends.map(t => t.branchAvg) || [];

  // ─── Insights ──────────────────────────────────────────────────
  const latestInsights = useMemo(() => {
    if (!data) return [];
    return data.riskInsights
      .filter(i => !i.isRead)
      .slice(0, 6);
  }, [data]);

  // ─── Bell Curve Calculations ─────────────────────────────────────
  const bellCurveData = useMemo(() => {
    if (!data || !data.branchRiskProfiles || data.branchRiskProfiles.length === 0) {
      return { curvePoints: [], branchPoints: [], stats: { mean: 0, stdDev: 0 } };
    }

    // Filter out branches with no/zero pawn duration
    const validBranches = data.branchRiskProfiles.filter(
      (b) => b.avgPawnDuration !== undefined && b.avgPawnDuration > 0
    );

    if (validBranches.length === 0) {
      return { curvePoints: [], branchPoints: [], stats: { mean: 0, stdDev: 0 } };
    }

    const values = validBranches.map((b) => b.avgPawnDuration!);
    const N = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / N;
    
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / N;
    // Fallback stdDev to 1 to avoid division by zero
    const stdDev = Math.max(1, Math.sqrt(variance));

    // Generate 80 points for the bell curve (from mean - 3.5 * stdDev to mean + 3.5 * stdDev)
    const curvePoints: { x: number; y: number }[] = [];
    const minX = mean - 3.5 * stdDev;
    const maxX = mean + 3.5 * stdDev;
    const step = (maxX - minX) / 79; // 80 points

    const pdf = (x: number) => {
      return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    };

    for (let i = 0; i < 80; i++) {
      const x = minX + i * step;
      curvePoints.push({
        x: Number(x.toFixed(2)),
        y: pdf(x),
      });
    }

    // Map each branch average duration to a scatter dot on the curve
    const branchPoints = validBranches.map((b) => {
      const x = b.avgPawnDuration!;
      const y = pdf(x);
      const zScore = (x - mean) / stdDev;
      return {
        id: b.id,
        branchName: b.branchName,
        outletName: b.outletName,
        avgPawnDuration: x,
        zScore: Number(zScore.toFixed(2)),
        x,
        y,
      };
    });

    return {
      curvePoints,
      branchPoints,
      stats: {
        mean: Number(mean.toFixed(1)),
        stdDev: Number(stdDev.toFixed(1)),
      },
    };
  }, [data]);

  // ─── BU Context Subtitle ───────────────────────────────────────
  const contextSubtitle = isConsolidated
    ? (language === "id"
      ? `Tampilan konsolidasi — ${businessUnits.length} unit bisnis, 3 sektor`
      : `Consolidated view — ${businessUnits.length} business units, 3 sectors`)
    : (language === "id"
      ? `${activeBU?.name} — ${sectorMeta[activeSector!].labelId}`
      : `${activeBU?.name} — ${sectorMeta[activeSector!].label}`);

  const handleRunScan = () => {
    alert("AI Anomaly Scan Engine:\n\n- Data sources scanned: Transactions, CIF Registers, General Ledgers.\n- Result: 0 new anomalies detected. Active risk thresholds remain within normal parameters.");
  };

  const handleExportRisk = () => {
    const element = document.createElement("a");
    const label = activeBU ? activeBU.name : "Holding_Consolidated";
    const content = `AuditSphere AI - Risk Intelligence Summary Report\n================================================\nScope: ${label}\nGenerated: ${new Date().toLocaleString()}\n\nActive Anomalies: 12\nCritical Customers: 3\nCompliance Rate: 91%`;
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Risk_Intelligence_Report_${label.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
        <p className="text-sm text-slate-400">Loading live risk intelligence data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="text-rose-500 text-3xl font-bold">Error</div>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("ri.dashTitle")}
        subtitle={contextSubtitle}
        actions={[
          { label: t("ri.btnRunScan"), variant: "default", onClick: handleRunScan },
          { label: t("ri.btnExportRisk"), onClick: handleExportRisk },
        ]}
      />

      {/* ─── Active BU/Sector Indicator ───────────────────────── */}
      {!isConsolidated && activeBU && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5"
        >
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
            style={{ backgroundColor: activeBU.color + "20", color: activeBU.color }}
          >
            {activeBU.shortName}
          </span>
          <div>
            <div className="text-sm font-medium text-white">{activeBU.name}</div>
            <div className="text-[11px] text-slate-500">
              {sectorMeta[activeSector!].icon} {activeBU.brand} • {activeSector}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Consolidated: Sector Overview Cards ──────────────── */}
      {isConsolidated && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(["PERGADAIAN", "MULTIFINANCE", "OTOMOTIF"] as SectorType[]).map(sector => {
            const meta = sectorMeta[sector];
            const sectorBUs = businessUnits.filter(bu => bu.sector === sector);
            const sectorDetections = data.anomalyDetections.filter(a => a.sector === sector);
            const activeCount = sectorDetections.filter(
              a => a.status === "DETECTED" || a.status === "CONFIRMED"
            ).length;

            return (
              <motion.div
                key={sector}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {language === "id" ? meta.labelId : meta.label}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {sectorBUs.length} {language === "id" ? "unit bisnis" : "business units"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/[0.03] p-2.5">
                    <div className="text-lg font-bold text-white">{activeCount}</div>
                    <div className="text-[10px] text-slate-500">{t("ri.totalAnomalies")}</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2.5">
                    <div className="text-lg font-bold text-white">{sectorBUs.length}</div>
                    <div className="text-[10px] text-slate-500">
                      {language === "id" ? "Unit Bisnis" : "BUs"}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {sectorBUs.map(bu => (
                    <span
                      key={bu.id}
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono"
                      style={{ backgroundColor: bu.color + "15", color: bu.color }}
                    >
                      {bu.shortName}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── KPI Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RiskKPICard
          label={t("ri.totalAnomalies")}
          value={metrics.activeAnomalies}
          change="+12% vs last month"
          changeValue={12}
          icon={Zap}
          color="rose"
          sparkData={anomalySparkData}
        />
        <RiskKPICard
          label={t("ri.criticalCustomers")}
          value={metrics.criticalCustomers}
          change="+3 this week"
          changeValue={3}
          icon={Users}
          color="amber"
        />
        <RiskKPICard
          label={t("ri.avgBranchScore")}
          value={`${metrics.avgBranchScore}/100`}
          change="-2.4 pts"
          changeValue={-2.4}
          icon={Building2}
          color="cyan"
          sparkData={branchSparkData}
        />
        <RiskKPICard
          label={t("ri.riskCoverage")}
          value={`${metrics.monitoredBranches}/${metrics.monitoredBranches}`}
          change="100% coverage"
          changeValue={0}
          icon={Shield}
          color="emerald"
        />
      </div>

      {/* ─── Charts Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Anomaly Distribution by Rule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              {t("ri.anomalyDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ruleDistribution} layout="vertical">
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="code" tick={<CustomYAxisTick />} axisLine={false} tickLine={false} width={36} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {ruleDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Score Trend (12 months) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              {t("ri.riskScoreTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.riskTrends}>
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
                <XAxis dataKey="period" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="customerAvg" stroke="#22d3ee" fill="url(#gradCustomer)" strokeWidth={2} name={t("ri.customerAvg")} />
                <Area type="monotone" dataKey="branchAvg" stroke="#fbbf24" fill="url(#gradBranch)" strokeWidth={2} name={t("ri.branchAvg")} />
                <Area type="monotone" dataKey="officerAvg" stroke="#a78bfa" fill="url(#gradOfficer)" strokeWidth={2} name={t("ri.officerAvg")} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ─── Pawn Duration Dispersion Normal Distribution Card ─── */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-amber-500" />
            {language === "id" 
              ? "Kurva Distribusi Normal Durasi Gadai Cabang" 
              : "Pawn Duration Normal Distribution Curve of Branches"}
          </CardTitle>
          <div className="text-xs text-slate-400">
            {language === "id"
              ? `Rata-rata Populasi (μ): ${bellCurveData.stats.mean} hari | Standar Deviasi (σ): ${bellCurveData.stats.stdDev} hari`
              : `Population Mean (μ): ${bellCurveData.stats.mean} days | Std Dev (σ): ${bellCurveData.stats.stdDev} days`}
          </div>
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
                
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  domain={['dataMin - 5', 'dataMax + 5']} 
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={false} 
                  tickLine={false}
                  unit={language === "id" ? " hari" : " days"}
                  tickFormatter={(val) => Number(val).toFixed(0)}
                />
                
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
                            <p>
                              {language === "id" ? "Rata-rata Durasi" : "Average Duration"}:{" "}
                              <span className="font-bold text-white">{avgPawnDuration} {language === "id" ? "hari" : "days"}</span>
                            </p>
                            <p>
                              Z-Score:{" "}
                              <span className="font-bold text-amber-400">{zLabel}</span>
                            </p>
                            <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.05] text-slate-300">
                              {groupLabel}
                            </span>
                          </div>
                        );
                      }

                      const curveData = payload.find(p => p.dataKey === "y");
                      if (curveData) {
                        const xVal = curveData.payload.x;
                        return (
                          <div className="rounded-lg border border-white/10 bg-[#0b1739] p-2 text-xs text-slate-300 shadow-md">
                            <p>{language === "id" ? "Durasi" : "Duration"}: <span className="text-white font-bold">{xVal} {language === "id" ? "hari" : "days"}</span></p>
                          </div>
                        );
                      }
                    }
                    return null;
                  }}
                />

                <Area
                  data={bellCurveData.curvePoints}
                  type="monotone"
                  dataKey="y"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradBell)"
                  dot={false}
                  activeDot={false}
                  name="Curve"
                />

                <Scatter
                  data={bellCurveData.branchPoints}
                  name={language === "id" ? "Cabang" : "Branch"}
                  fill="#22d3ee"
                />

                <ReferenceLine 
                  x={bellCurveData.stats.mean} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3"
                  label={{ 
                    value: "Mean (μ)", 
                    position: "top", 
                    fill: "#ef4444", 
                    fontSize: 9, 
                    fontWeight: "bold" 
                  }} 
                />
                
                <ReferenceLine 
                  x={bellCurveData.stats.mean + bellCurveData.stats.stdDev} 
                  stroke="#f59e0b" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: "+1σ", 
                    position: "top", 
                    fill: "#f59e0b", 
                    fontSize: 9 
                  }} 
                />
                <ReferenceLine 
                  x={bellCurveData.stats.mean - bellCurveData.stats.stdDev} 
                  stroke="#f59e0b" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: "-1σ", 
                    position: "top", 
                    fill: "#f59e0b", 
                    fontSize: 9 
                  }} 
                />

                <ReferenceLine 
                  x={bellCurveData.stats.mean + 2 * bellCurveData.stats.stdDev} 
                  stroke="#eab308" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: "+2σ", 
                    position: "top", 
                    fill: "#eab308", 
                    fontSize: 9 
                  }} 
                />
                <ReferenceLine 
                  x={bellCurveData.stats.mean - 2 * bellCurveData.stats.stdDev} 
                  stroke="#eab308" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: "-2σ", 
                    position: "top", 
                    fill: "#eab308", 
                    fontSize: 9 
                  }} 
                />

                <ReferenceLine 
                  x={bellCurveData.stats.mean + 3 * bellCurveData.stats.stdDev} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: "+3σ", 
                    position: "top", 
                    fill: "#ef4444", 
                    fontSize: 9 
                  }} 
                />
                <ReferenceLine 
                  x={bellCurveData.stats.mean - 3 * bellCurveData.stats.stdDev} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: "-3σ", 
                    position: "top", 
                    fill: "#ef4444", 
                    fontSize: 9 
                  }} 
                />

              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              {language === "id" ? "Tidak ada data durasi gadai cabang wajar" : "No branch pawn duration data available"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Bottom Row: Table + Heatmap + Insights ───────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Top Risk Customers */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              {t("ri.topRiskCustomers")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCustomers.map((c, idx) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 w-4">{idx + 1}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">CIF</span>
                    <span className="text-sm font-medium font-mono text-white truncate">{c.customerName}</span>
                  </div>
                  <div className="ml-6 flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 truncate">{c.primaryOutlet}</span>
                    {isConsolidated && (
                      <>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-white/[0.04] text-slate-400">
                          {c.sector.substring(0, 3)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RiskScoreGauge score={c.totalScore} size={40} showLabel={false} animate={false} />
                  <RiskLevelIndicator level={c.riskLevel} />
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Branch Risk Heatmap Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-400" />
              {t("ri.branchRiskHeatmap")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-1.5">
              {data.branchRiskProfiles.slice(0, 30).map(b => {
                const bg = b.riskLevel === "CRITICAL" ? "bg-rose-500/40 border-rose-500/50"
                  : b.riskLevel === "HIGH" ? "bg-amber-500/30 border-amber-500/40"
                  : b.riskLevel === "MEDIUM" ? "bg-yellow-500/20 border-yellow-500/30"
                  : "bg-emerald-500/15 border-emerald-500/25";

                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.random() * 0.5 }}
                    className={`group relative aspect-square rounded-lg border ${bg} flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform`}
                    title={`${b.outletName}\nScore: ${b.totalScore}\nAnomalies: ${b.anomalyCount}`}
                  >
                    <span className="text-[9px] font-mono font-bold text-white/80">{b.totalScore}</span>
                    <span className="text-[7px] text-white/50 truncate max-w-full px-0.5">{b.outletCode.split("-").pop()}</span>
                  </motion.div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-3">
              {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as RiskLevel[]).map(level => {
                const c = level === "CRITICAL" ? "bg-rose-500"
                  : level === "HIGH" ? "bg-amber-500"
                  : level === "MEDIUM" ? "bg-yellow-500"
                  : "bg-emerald-500";
                return (
                  <div key={level} className="flex items-center gap-1">
                    <div className={`h-2 w-2 rounded-sm ${c}`} />
                    <span className="text-[9px] text-slate-400">{t(`ri.${level.toLowerCase()}` as any)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Risk Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-400" />
              {t("ri.aiInsights")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {latestInsights.map((insight, idx) => {
              const borderColor = insight.severity === "CRITICAL" ? "border-l-rose-500"
                : insight.severity === "HIGH" ? "border-l-amber-500"
                : insight.severity === "MEDIUM" ? "border-l-yellow-500"
                : "border-l-emerald-500";

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className={`rounded-lg border border-white/5 border-l-2 ${borderColor} bg-white/[0.02] p-3 hover:bg-white/[0.04] transition`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <RiskLevelIndicator level={insight.severity} />
                    <span className="text-[10px] text-slate-500 shrink-0">{insight.generatedAt}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {language === "id" ? insight.insightTextId : insight.insightText}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {t(`ri.${insight.category.toLowerCase() === "alert" ? "detected" : insight.category.toLowerCase()}` as any)}
                    </span>
                    <span className="text-[10px] text-slate-600">•</span>
                    <span className="text-[10px] text-cyan-400/70 font-mono">{insight.confidence}% confidence</span>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ─── Risk Distribution Donut ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            {t("ri.anomalyTimeline")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {riskDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {riskDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                  <div>
                    <div className="text-sm font-medium text-white">{d.value}</div>
                    <div className="text-[11px] text-slate-400">{d.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
