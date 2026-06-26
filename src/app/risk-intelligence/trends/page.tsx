"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
  ComposedChart, Line, Scatter, ReferenceLine,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { getRiskData } from "@/lib/risk-mock-data";
import { useBusinessUnitStore, useActiveSector } from "@/hooks/use-business-unit";
import { sectorMeta } from "@/lib/business-units";
import { getAnomalyRuleColor } from "@/components/risk-intelligence/anomaly-rule-badge";
import type { AnomalyRuleCode } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

export default function RiskTrendsPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeSector = useActiveSector();
  const data = useMemo(() => getRiskData(activeBUId), [activeBUId]);

  // Dynamic terminology
  const customerLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Nasabah/Debitur/Pembeli" : "Customer/Debtor/Buyer";
    return sectorMeta[activeSector].entityLabels.customer[language];
  }, [activeSector, language]);

  const branchLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Kantor/Cabang" : "Branch/Outlet";
    return sectorMeta[activeSector].entityLabels.branch[language];
  }, [activeSector, language]);

  const officerLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Petugas/Penaksir" : "Officer/Appraiser";
    return sectorMeta[activeSector].entityLabels.officer[language];
  }, [activeSector, language]);

  const ruleKeys = useMemo(() => data.anomalyRules.map(r => r.code), [data.anomalyRules]);

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

  // Period comparison: this quarter vs last quarter
  const periodComparison = useMemo(() => {
    const trends = data.riskTrends;
    const thisQ = trends.slice(-3);
    const lastQ = trends.slice(-6, -3);

    const avg = (arr: typeof trends, key: keyof typeof trends[0]) =>
      Math.round(arr.reduce((s, d) => s + (d[key] as number), 0) / Math.max(1, arr.length));

    return {
      thisQuarter: {
        customerAvg: avg(thisQ, "customerAvg"),
        branchAvg: avg(thisQ, "branchAvg"),
        officerAvg: avg(thisQ, "officerAvg"),
        anomalyCount: thisQ.reduce((s, d) => s + d.anomalyCount, 0),
      },
      lastQuarter: {
        customerAvg: avg(lastQ, "customerAvg"),
        branchAvg: avg(lastQ, "branchAvg"),
        officerAvg: avg(lastQ, "officerAvg"),
        anomalyCount: lastQ.reduce((s, d) => s + d.anomalyCount, 0),
      },
    };
  }, [data]);

  const comparisonMetrics = useMemo(() => [
    {
      label: language === "id" ? `Rata-rata ${customerLabel}` : `${customerLabel} Avg`,
      current: periodComparison.thisQuarter.customerAvg,
      previous: periodComparison.lastQuarter.customerAvg,
      color: "#22d3ee",
    },
    {
      label: language === "id" ? `Rata-rata ${branchLabel}` : `${branchLabel} Avg`,
      current: periodComparison.thisQuarter.branchAvg,
      previous: periodComparison.lastQuarter.branchAvg,
      color: "#fbbf24",
    },
    {
      label: language === "id" ? `Rata-rata ${officerLabel}` : `${officerLabel} Avg`,
      current: periodComparison.thisQuarter.officerAvg,
      previous: periodComparison.lastQuarter.officerAvg,
      color: "#a78bfa",
    },
    {
      label: t("ri.anomalyCount"),
      current: periodComparison.thisQuarter.anomalyCount,
      previous: periodComparison.lastQuarter.anomalyCount,
      color: "#f43f5e",
    },
  ], [periodComparison, t, language, customerLabel, branchLabel, officerLabel]);

  const handleRefreshTrends = () => {
    alert("Refreshing Risk Trends:\n\n- Repopulating 12-month trailing moving averages.\n- Dynamic predictive projections updated based on latest anomaly detections.\n- Complete refresh success.");
  };

  const handlePeriodCompare = () => {
    alert(`Period Comparison Projections:\n\n- Previous Quarter Average: ${periodComparison.lastQuarter.riskScore}\n- Current Quarter Average: ${periodComparison.thisQuarter.riskScore}\n- Velocity Variance: ${((periodComparison.thisQuarter.anomalyCount - periodComparison.lastQuarter.anomalyCount) / periodComparison.lastQuarter.anomalyCount * 100).toFixed(1)}%`);
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("ri.trendsTitle")}
        subtitle={t("ri.trendsSubtitle")}
        actions={[
          { label: t("ri.btnRefreshTrends"), variant: "default", onClick: handleRefreshTrends },
          { label: t("ri.btnPeriodCompare"), onClick: handlePeriodCompare },
        ]}
      />

      {/* Score Trend (12 months) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            {t("ri.scoreTrendChart")}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.riskTrends}>
              <defs>
                <linearGradient id="trendCust" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="trendBranch" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="trendOfficer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="period" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="customerAvg" stroke="#22d3ee" fill="url(#trendCust)" strokeWidth={2} name={language === "id" ? `Rata-rata ${customerLabel}` : `${customerLabel} Avg`} />
              <Area type="monotone" dataKey="branchAvg" stroke="#fbbf24" fill="url(#trendBranch)" strokeWidth={2} name={language === "id" ? `Rata-rata ${branchLabel}` : `${branchLabel} Avg`} />
              <Area type="monotone" dataKey="officerAvg" stroke="#a78bfa" fill="url(#trendOfficer)" strokeWidth={2} name={language === "id" ? `Rata-rata ${officerLabel}` : `${officerLabel} Avg`} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomaly Detection Velocity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            {t("ri.anomalyVelocity")}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.anomalyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="period" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              {ruleKeys.map(code => (
                <Bar key={code} dataKey={code} stackId="rules" fill={getAnomalyRuleColor(code)} barSize={24} name={code} />
              ))}
              <Line type="monotone" dataKey="total" stroke="#ffffff" strokeWidth={2} dot={{ fill: "#fff", r: 3 }} name="Total" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
        {/* Legend */}
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {ruleKeys.map(code => (
              <div key={code} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: getAnomalyRuleColor(code) }} />
                <span className="text-[10px] font-mono text-slate-400">{code}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── Pawn Duration Dispersion Normal Distribution Card ─── */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-amber-500" />
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

      {/* Period Comparison */}
      <Card>
        <CardHeader><CardTitle>{t("ri.periodComparison")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {comparisonMetrics.map(m => {
              const diff = m.current - m.previous;
              const pct = m.previous > 0 ? Math.round((diff / m.previous) * 100) : 0;
              const isUp = diff > 0;

              return (
                <div key={m.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="text-xs text-slate-400 mb-2">{m.label}</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold font-mono" style={{ color: m.color }}>{m.current}</div>
                      <div className="text-xs text-slate-500 mt-0.5">vs {m.previous} prev</div>
                    </div>
                    <div className={`text-right ${isUp ? "text-rose-400" : "text-emerald-400"}`}>
                      <div className="text-sm font-bold font-mono">{isUp ? "+" : ""}{pct}%</div>
                      <div className="text-[10px]">{isUp ? "↑" : "↓"} {Math.abs(diff)}</div>
                    </div>
                  </div>
                  {/* Mini comparison bar */}
                  <div className="mt-3 flex gap-1">
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: m.color, width: `${Math.min(100, (m.current / Math.max(m.current, m.previous)) * 100)}%`, opacity: 0.8 }} />
                    <div className="h-1.5 rounded-full bg-white/10 flex-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
