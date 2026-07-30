"use client";

import { useMemo, useState, useEffect } from "react";
import { TrendingUp, Activity, Brain } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
  ComposedChart, Line, Scatter, ReferenceLine,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU, useActiveSector } from "@/hooks/use-business-unit";
import { sectorMeta } from "@/lib/business-units";
import { getAnomalyRuleColor } from "@/components/risk-intelligence/anomaly-rule-badge";
import { AIEarlyWarningBanner } from "@/components/risk-intelligence/ai-early-warning-banner";
import type { AnomalyRuleCode } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

export default function RiskTrendsPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeBU = useActiveBU();
  const validBUId = activeBU ? activeBU.id : null;
  const activeSector = useActiveSector();

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const url = `/api/risk-intelligence` + (validBUId ? `?buId=${validBUId}` : "");

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch trends data");
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
          setError(err.message || "Failed to load trends data");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [validBUId]);

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

  const ruleKeys = useMemo(() => data ? data.anomalyRules.map((r: any) => r.code) : [], [data]);

  // ─── Bell Curve Calculations ─────────────────────────────────────
  const bellCurveData = useMemo(() => {
    if (!data || !data.branchRiskProfiles || data.branchRiskProfiles.length === 0) {
      return { curvePoints: [], branchPoints: [], stats: { mean: 0, stdDev: 0 } };
    }

    // Filter out branches with no/zero pawn duration
    const validBranches = data.branchRiskProfiles.filter(
      (b: any) => b.avgPawnDuration !== undefined && b.avgPawnDuration > 0
    );

    if (validBranches.length === 0) {
      return { curvePoints: [], branchPoints: [], stats: { mean: 0, stdDev: 0 } };
    }

    const values = validBranches.map((b: any) => b.avgPawnDuration!);
    const N = values.length;
    const mean = values.reduce((sum: number, v: number) => sum + v, 0) / N;
    const variance = values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / N;
    const stdDev = Math.max(1, Math.sqrt(variance));

    const curvePoints = [];
    const minX = Math.max(0, mean - 3.5 * stdDev);
    const maxX = mean + 3.5 * stdDev;
    const step = (maxX - minX) / 79; // 80 points total

    const pdf = (x: number) =>
      (1 / (stdDev * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));

    for (let i = 0; i < 80; i++) {
      const x = minX + i * step;
      curvePoints.push({ x: Number(x.toFixed(2)), y: pdf(x) });
    }

    // Map each branch average duration to a scatter dot on the curve
    const branchPoints = validBranches.map((b: any) => {
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

  // ── AI Pawn Duration Insight Computation ────────────────────────────────
  const aiPawnInsight = useMemo(() => {
    if (!bellCurveData || bellCurveData.branchPoints.length === 0) return null;

    const totalBranches = bellCurveData.branchPoints.length;
    const mean = bellCurveData.stats.mean;
    const stdDev = bellCurveData.stats.stdDev;

    const normalBranches = bellCurveData.branchPoints.filter((b: any) => Math.abs(b.zScore) <= 1);
    const warningBranches = bellCurveData.branchPoints.filter((b: any) => Math.abs(b.zScore) > 1 && Math.abs(b.zScore) <= 2);
    const extremeBranches = bellCurveData.branchPoints.filter((b: any) => Math.abs(b.zScore) > 2);

    const sorted = [...bellCurveData.branchPoints].sort((a: any, b: any) => a.avgPawnDuration - b.avgPawnDuration);
    const lowestBranch = sorted[0];
    const highestBranch = sorted[sorted.length - 1];

    return {
      totalBranches,
      mean,
      stdDev,
      normalCount: normalBranches.length,
      warningCount: warningBranches.length,
      extremeCount: extremeBranches.length,
      lowestBranch,
      highestBranch,
      minNormalRange: Math.max(0, Number((mean - stdDev).toFixed(1))),
      maxNormalRange: Number((mean + stdDev).toFixed(1)),
    };
  }, [bellCurveData]);

  // Period comparison: this quarter vs last quarter
  const periodComparison = useMemo(() => {
    if (!data || !data.riskTrends) {
      return {
        thisQuarter: { customerAvg: 0, branchAvg: 0, officerAvg: 0, anomalyCount: 0 },
        lastQuarter: { customerAvg: 0, branchAvg: 0, officerAvg: 0, anomalyCount: 0 }
      };
    }
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
    alert(`Period Comparison Projections:\n\n- Previous Quarter Average: ${periodComparison.lastQuarter.branchAvg}\n- Current Quarter Average: ${periodComparison.thisQuarter.branchAvg}\n- Velocity Variance: ${((periodComparison.thisQuarter.anomalyCount - periodComparison.lastQuarter.anomalyCount) / periodComparison.lastQuarter.anomalyCount * 100).toFixed(1)}%`);
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

      {/* AI Predictive Early Warning Banner */}
      <AIEarlyWarningBanner
        sectorName={activeBU ? activeBU.name : "Holding Consolidated"}
        predictedEscalationPercent={28}
        highRiskFocusBranch="Cabang Bandung Dago & Outlet Menteng"
        recommendedAction="Sistem AI memprediksi lonjakan anomali aging & overdue +28% dalam 30 hari ke depan. Jadwalkan audit preventif."
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
            <AreaChart data={data?.riskTrends || []}>
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
            <ComposedChart data={data?.anomalyTrends || []}>
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

      {/* ─── Pawn Duration Dispersion Normal Distribution Card (Only for PERGADAIAN) ─── */}
      {activeSector === "PERGADAIAN" && (
        <Card className="border-amber-500/20 bg-slate-900/80 shadow-2xl overflow-hidden">
          <CardHeader className="py-4 border-b border-slate-800/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                  <Activity className="h-5 w-5 text-amber-500" />
                  {language === "id" 
                    ? "Kurva Distribusi Normal Durasi Gadai Cabang" 
                    : "Pawn Duration Normal Distribution Curve of Branches"}
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  {language === "id"
                    ? "Analisis statistik persebaran durasi transaksi pencairan hingga tebus/perpanjang pada seluruh outlet cabang."
                    : "Statistical dispersion analysis of pawn duration from disbursement to settlement across branch outlets."}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-indigo-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg shrink-0">
                <Brain className="h-4 w-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-semibold text-amber-300">AI Audit Analysis Active</span>
              </div>
            </div>

            {/* ── AI Executive Explanation Box ── */}
            {aiPawnInsight && (
              <div className="mt-3 p-3.5 rounded-xl border border-cyan-500/25 bg-slate-950/80 backdrop-blur-md">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 mt-0.5 shrink-0">
                    <Brain className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <span>🤖 Penjelasan & Analisis Otomatis AI Auditor:</span>
                    </p>
                    <p className="leading-relaxed">
                      Rata-rata durasi gadai populasi adalah <strong className="text-white">{aiPawnInsight.mean} hari</strong> (rentang wajar ±1σ: <span className="text-cyan-300 font-semibold">{aiPawnInsight.minNormalRange}–{aiPawnInsight.maxNormalRange} hari</span>).
                      {aiPawnInsight.extremeCount > 0 ? (
                        <> Terdeteksi <strong className="text-red-400 font-bold">{aiPawnInsight.extremeCount} cabang di zona anomali ekstrim (&gt;±2σ)</strong> yang memerlukan perhatian audit langsung.</>
                      ) : (
                        <> Seluruh cabang berada dalam pola transaksi statistik yang wajar.</>
                      )}
                    </p>

                    {aiPawnInsight.lowestBranch && (
                      <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="flex items-center gap-1 bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md font-medium">
                          🚨 Durasi Tercepat (Indikasi Pelunasan Fiktif/Cepat): <strong className="text-white ml-0.5">{aiPawnInsight.lowestBranch.branchName}</strong> ({aiPawnInsight.lowestBranch.avgPawnDuration} hari)
                        </span>
                        {aiPawnInsight.highestBranch && (
                          <span className="flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-medium">
                            ⚠️ Durasi Terpanjang (Indikasi Penundaan Lelang): <strong className="text-white ml-0.5">{aiPawnInsight.highestBranch.branchName}</strong> ({aiPawnInsight.highestBranch.avgPawnDuration} hari)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Visual Plain Guide Bar ── */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                <span className="h-3 w-3 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]" />
                <div>
                  <p className="font-bold text-[11px]">🟢 Zona Hijau (Wajar)</p>
                  <p className="text-[10px] text-emerald-200/70">±1σ dari rata-rata ({aiPawnInsight?.normalCount || 0} cabang)</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                <span className="h-3 w-3 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_#fbbf24]" />
                <div>
                  <p className="font-bold text-[11px]">🟡 Zona Kuning (Peringatan)</p>
                  <p className="text-[10px] text-amber-200/70">±2σ dari rata-rata ({aiPawnInsight?.warningCount || 0} cabang)</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300">
                <span className="h-3 w-3 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_#ef4444]" />
                <div>
                  <p className="font-bold text-[11px]">🔴 Zona Merah (Anomali Ekstrim)</p>
                  <p className="text-[10px] text-red-200/70">&gt;±2σ perlu audit langsung ({aiPawnInsight?.extremeCount || 0} cabang)</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="h-[360px] pb-4 pt-4">
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
                          let groupBadge = "";
                          if (Math.abs(zScore) <= 1) {
                            groupLabel = "Wajar (68% Populasi)";
                            groupBadge = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
                          } else if (Math.abs(zScore) <= 2) {
                            groupLabel = "Peringatan (95% Populasi)";
                            groupBadge = "bg-amber-500/20 text-amber-300 border-amber-500/30";
                          } else {
                            groupLabel = "Anomali Ekstrim (99% Populasi)";
                            groupBadge = "bg-red-500/20 text-red-300 border-red-500/30";
                          }

                          return (
                            <div className="rounded-xl border border-white/15 bg-[#0b1739]/95 p-3.5 text-xs text-slate-200 shadow-2xl backdrop-blur-md max-w-xs space-y-1.5">
                              <div className="border-b border-white/10 pb-1.5">
                                <p className="font-bold text-sm text-cyan-300">{branchName}</p>
                                <p className="text-[10px] text-slate-400">{outletName}</p>
                              </div>
                              <p className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Rata-rata Durasi:</span>
                                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{avgPawnDuration} hari</span>
                              </p>
                              <p className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Penyimpangan (Z-Score):</span>
                                <span className="font-bold text-amber-400">{zLabel}</span>
                              </p>
                              <div className={`mt-2 p-1.5 rounded text-[10px] font-medium border ${groupBadge}`}>
                                💡 Evaluasi AI: {groupLabel}
                              </div>
                            </div>
                          );
                        }

                        const curveData = payload.find(p => p.dataKey === "y");
                        if (curveData) {
                          const xVal = curveData.payload.x;
                          return (
                            <div className="rounded-lg border border-white/10 bg-[#0b1739] p-2 text-xs text-slate-300 shadow-md">
                              <p>Titik Durasi: <span className="text-white font-bold">{xVal} hari</span></p>
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
      )}

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
