"use client";

import { useMemo, useState, useEffect } from "react";
import { UserCog, ArrowUpRight, ArrowDownRight, Minus, Brain, AlertTriangle, ShieldAlert, BarChart3, ChevronRight, Building2, Eye, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU, useActiveSector } from "@/hooks/use-business-unit";
import { businessUnits, sectorMeta } from "@/lib/business-units";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { RiskScoreGauge } from "@/components/risk-intelligence/risk-score-gauge";
import { AnomalyRuleBadge } from "@/components/risk-intelligence/anomaly-rule-badge";
import { AIRiskCopilotDrawer } from "@/components/risk-intelligence/ai-risk-copilot-drawer";
import type { OfficerRiskProfile, RiskLevel, SectorType } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

const riskLevelColors: Record<RiskLevel, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

// ─── KPI Stat Card ──────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, color, delay = 0, subtitle }: {
  icon: any; label: string; value: number | string; color: string; delay?: number; subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1429]/90 via-[#0a1122]/95 to-[#0d172e]/90 p-5 shadow-xl backdrop-blur-xl"
    >
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
          <p className="text-2xl font-bold font-mono text-white">{value}</p>
          {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="rounded-xl p-2.5 border border-white/10" style={{ backgroundColor: color + "15" }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function OfficerRiskPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const setActiveBU = useBusinessUnitStore((s) => s.setActiveBU);
  const activeBU = useActiveBU();
  const validBUId = activeBU ? activeBU.id : null;
  const activeSector = useActiveSector();

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OfficerRiskProfile | null>(null);

  const isDetailMode = !!validBUId;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const url = `/api/risk-intelligence` + (validBUId ? `?buId=${validBUId}` : ``);

    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch officer data");
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
          setError(err.message || "Failed to load officer data");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [validBUId]);

  // Dynamic terminology
  const officerLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Petugas/Penaksir" : "Officer/Appraiser";
    return sectorMeta[activeSector].entityLabels.officer[language];
  }, [activeSector, language]);

  const branchLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Kantor/Cabang" : "Branch/Outlet";
    return sectorMeta[activeSector].entityLabels.branch[language];
  }, [activeSector, language]);

  const handleSelectBU = (buId: string) => {
    setActiveBU(buId);
    setSearch("");
    setSelected(null);
  };

  const handleBackToOverview = () => {
    setActiveBU(null);
    setSelected(null);
  };

  // ─── Executive Summary Computations ──────────────────────────────
  const overviewMetrics = useMemo(() => {
    if (!data) return { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgGap: 0 };
    const all = data.officerRiskProfiles || [];
    const total = all.length;
    const critical = all.filter((o: any) => o.riskLevel === "CRITICAL").length;
    const high = all.filter((o: any) => o.riskLevel === "HIGH").length;
    const medium = all.filter((o: any) => o.riskLevel === "MEDIUM").length;
    const low = all.filter((o: any) => o.riskLevel === "LOW").length;
    const avgGap = total > 0 ? Math.round(all.reduce((s: number, o: any) => s + (o.supervisoryGapScore || 0), 0) / total) : 0;
    return { total, critical, high, medium, low, avgGap };
  }, [data]);

  const riskDistribution = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Critical", value: overviewMetrics.critical, fill: "#ef4444" },
      { name: "High", value: overviewMetrics.high, fill: "#f97316" },
      { name: "Medium", value: overviewMetrics.medium, fill: "#eab308" },
      { name: "Low", value: overviewMetrics.low, fill: "#22c55e" },
    ].filter(d => d.value > 0);
  }, [data, overviewMetrics]);

  // BU Summary Ranking for Overview Mode (Top 10)
  const buSummaryRows = useMemo(() => {
    if (!data) return [];
    const profiles = data.officerRiskProfiles || [];

    const buMap = new Map<string, {
      buId: string; buName: string; buCode: string;
      sector: SectorType; color: string; icon: string;
      total: number; critical: number; high: number; medium: number; low: number;
      totalScore: number; totalGap: number;
    }>();

    for (const bu of businessUnits) {
      buMap.set(bu.id, {
        buId: bu.id, buName: bu.name, buCode: bu.code,
        sector: bu.sector, color: bu.color, icon: sectorMeta[bu.sector].icon,
        total: 0, critical: 0, high: 0, medium: 0, low: 0,
        totalScore: 0, totalGap: 0,
      });
    }

    for (const o of profiles) {
      let matchedBuId: string | null = null;
      if (buMap.has(o.businessUnitId)) {
        matchedBuId = o.businessUnitId;
      } else {
        const sectorBUs = businessUnits.filter(bu => bu.sector === o.sector);
        if (sectorBUs.length > 0) matchedBuId = sectorBUs[0].id;
      }

      if (matchedBuId && buMap.has(matchedBuId)) {
        const row = buMap.get(matchedBuId)!;
        row.total++;
        row.totalScore += o.totalScore;
        row.totalGap += o.supervisoryGapScore || 0;
        if (o.riskLevel === "CRITICAL") row.critical++;
        else if (o.riskLevel === "HIGH") row.high++;
        else if (o.riskLevel === "MEDIUM") row.medium++;
        else row.low++;
      }
    }

    return Array.from(buMap.values())
      .filter(row => row.total > 0)
      .sort((a, b) => (b.critical + b.high) - (a.critical + a.high))
      .slice(0, 10);
  }, [data]);

  // AI Executive Summary lines for Officers
  const aiSummary = useMemo(() => {
    if (!data || !data.officerRiskProfiles || data.officerRiskProfiles.length === 0) return null;
    const profiles = data.officerRiskProfiles;
    const highRiskCount = profiles.filter((o: any) => o.riskLevel === "CRITICAL" || o.riskLevel === "HIGH").length;
    const highGapCount = profiles.filter((o: any) => (o.supervisoryGapScore || 0) > 20).length;
    const topBU = buSummaryRows[0];

    const lines = language === "id" ? [
      `Terdeteksi **${highRiskCount} petugas berisiko tinggi** (Critical + High) dari total ${profiles.length} petugas/penaksir yang dipantau.`,
      `Terdapat **${highGapCount} petugas** dengan *Supervisory Gap Index* tinggi (>20), menipisnya pengawasan pada transaksi berisiko.`,
      topBU ? `Business Unit **${topBU.buName}** mencatat konsentrasi risiko petugas tertinggi (${topBU.critical + topBU.high} petugas Critical/High).` : null,
      `**Rekomendasi:** Prioritaskan audit investigasi internal pada petugas dengan skor celah pengawasan tertinggi.`,
    ] : [
      `Detected **${highRiskCount} high-risk officers** (Critical + High) out of ${profiles.length} total monitored officers/appraisers.`,
      `There are **${highGapCount} officers** with high *Supervisory Gap Index* (>20), indicating reduced control oversight.`,
      topBU ? `Business Unit **${topBU.buName}** has the highest officer risk concentration (${topBU.critical + topBU.high} Critical/High officers).` : null,
      `**Recommendation:** Prioritize internal audit reviews on officers with the highest supervisory gap scores.`,
    ];

    return lines.filter(Boolean) as string[];
  }, [data, buSummaryRows, language]);

  // ─── Detail Mode Computations ─────────────────────────────────────
  const sorted = useMemo(() => {
    if (!data || !isDetailMode) return [];
    return [...(data.officerRiskProfiles || [])]
      .sort((a: any, b: any) => b.totalScore - a.totalScore)
      .filter((o: any) => {
        if (search && !o.officerName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
  }, [search, data, isDetailMode]);

  const topOfficerChart = useMemo(() => {
    if (!isDetailMode) return [];
    return sorted.slice(0, 12).map(o => ({
      name: o.officerName.split(",")[0].split(" ").slice(-1)[0],
      score: o.totalScore,
      gap: o.supervisoryGapScore,
      fill: o.totalScore >= 80 ? "#ef4444" : o.totalScore >= 60 ? "#f59e0b" : o.totalScore >= 35 ? "#eab308" : "#22c55e",
    }));
  }, [sorted, isDetailMode]);

  const handleReviewOfficer = () => {
    alert(`Reviewing ${officerLabel}:\n\nActive Target: ${selected ? selected.officerName : "None selected"}\nPosition: ${selected ? selected.position : "N/A"}\nRisk Score: ${selected ? selected.totalScore : "N/A"}\nSupervisory Gap: ${selected ? selected.supervisoryGapScore : "N/A"}\nAction: Internal audit review case logged.`);
  };

  const handleSupervisoryReport = () => {
    const element = document.createElement("a");
    const name = selected ? selected.officerName : "Active_Officer";
    const content = `AuditSphere AI - Officer Supervisory Risk Audit Report\n======================================================\nOfficer: ${name}\nPosition: ${selected ? selected.position : "N/A"}\nRisk Score: ${selected ? selected.totalScore : "N/A"}\nSupervisory Gap Index: ${selected ? selected.supervisoryGapScore : "N/A"}\nGenerated: ${new Date().toLocaleString()}`;
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Supervisory_Report_${name.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
        <p className="text-sm text-slate-400">{language === "id" ? `Memuat data ${officerLabel.toLowerCase()}...` : `Loading ${officerLabel.toLowerCase()} data...`}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="text-rose-500 text-3xl font-bold">Error</div>
        <p className="text-sm text-slate-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // ═══════════════════════════════════════════════════════════════════
  // MODE 1: ALL BUSINESS UNITS — Executive Overview
  // ═══════════════════════════════════════════════════════════════════
  if (!isDetailMode) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader
          title={language === "id" ? `Officer Risk — Ringkasan Eksekutif` : `Officer Risk — Executive Summary`}
          subtitle={language === "id"
            ? `Tampilan strategis risiko ${officerLabel.toLowerCase()} seluruh Business Unit. Pilih Business Unit untuk melihat detail operasional.`
            : `Strategic ${officerLabel.toLowerCase()} risk overview across all Business Units. Select a Business Unit for operational details.`
          }
        />

        {/* ─── KPI Summary Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <KPICard
            icon={UserCog}
            label={language === "id" ? `Total ${officerLabel} Berisiko` : `Total Risk ${officerLabel}s`}
            value={overviewMetrics.total}
            color="#06b6d4"
            delay={0}
          />
          <KPICard
            icon={AlertTriangle}
            label="Critical Risk"
            value={overviewMetrics.critical}
            color="#ef4444"
            delay={0.05}
            subtitle={language === "id" ? "Investigasi internal" : "Internal investigation"}
          />
          <KPICard
            icon={ShieldAlert}
            label="High Risk"
            value={overviewMetrics.high}
            color="#f97316"
            delay={0.1}
            subtitle={language === "id" ? "Supervisi ketat" : "Strict supervision"}
          />
          <KPICard
            icon={BarChart3}
            label="Medium Risk"
            value={overviewMetrics.medium}
            color="#eab308"
            delay={0.15}
          />
          <KPICard
            icon={UserCog}
            label="Rata-rata Celah Pengawasan"
            value={`${overviewMetrics.avgGap}/40`}
            color="#6366f1"
            delay={0.2}
            subtitle={language === "id" ? "Supervisory Gap Index" : "Supervisory Gap Index"}
          />
        </div>

        {/* ─── AI Executive Summary ──────────────────────────────────── */}
        {aiSummary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-[#0b1429]/90 to-[#0d172e]/90 shadow-xl shadow-cyan-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-cyan-300">
                  <Brain className="h-5 w-5 text-cyan-400" />
                  <span>AI Executive Summary</span>
                  <span className="ml-2 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
                    🤖 AI-Generated
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {aiSummary.map((line, i) => (
                    <p key={i} className="text-sm text-slate-200 leading-relaxed">
                      {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                        j % 2 === 1 ? (
                          <span key={j} className="font-bold text-cyan-300">{part}</span>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Risk Distribution + BU Ranking ────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* Risk Distribution Pie */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl shadow-xl h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-white">
                  <PieChartIcon className="h-4 w-4 text-cyan-400" />
                  <span>{language === "id" ? `Distribusi Risiko ${officerLabel}` : `${officerLabel} Risk Distribution`}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                        {riskDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2">
                  {riskDistribution.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                        <span className="text-xs text-slate-300">{d.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 10 BU Summary Table */}
          <motion.div
            className="xl:col-span-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm text-white">
                    <Building2 className="h-4 w-4 text-cyan-400" />
                    <span>{language === "id" ? `Top 10 Business Unit — High Risk ${officerLabel}` : `Top 10 Business Units — High Risk ${officerLabel}s`}</span>
                  </CardTitle>
                  <span className="text-xs text-slate-400">
                    {language === "id"
                      ? "Diurutkan berdasarkan jumlah petugas Critical + High"
                      : "Sorted by Critical + High officer count"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">#</th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Business Unit</th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
                          {language === "id" ? `Total ${officerLabel}` : `Total ${officerLabel}s`}
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
                          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Critical</span>
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
                          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> High</span>
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
                          {language === "id" ? "Skor Rata-rata" : "Avg Score"}
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buSummaryRows.map((row, idx) => {
                        const avgScore = row.total > 0 ? Math.round(row.totalScore / row.total) : 0;
                        const riskLevel = riskLevelFromScore(avgScore);
                        return (
                          <motion.tr
                            key={row.buId}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.4 + idx * 0.04 }}
                            onClick={() => handleSelectBU(row.buId)}
                            className="border-b border-white/5 cursor-pointer transition-all duration-200 hover:bg-cyan-500/5 group"
                          >
                            <td className="px-3 py-3 text-xs text-slate-500 font-mono">{idx + 1}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{row.icon}</span>
                                <div>
                                  <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition">{row.buName}</div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.color }} />
                                    {row.buCode} • {language === "id" ? sectorMeta[row.sector].labelId : sectorMeta[row.sector].label}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-mono font-bold text-white">{row.total}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-mono font-bold text-sm ${row.critical > 0 ? "text-red-400" : "text-slate-600"}`}>
                                {row.critical}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-mono font-bold text-sm ${row.high > 0 ? "text-orange-400" : "text-slate-600"}`}>
                                {row.high}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono font-bold text-sm" style={{ color: riskLevelColors[riskLevel] }}>
                                  {avgScore}
                                </span>
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                                  style={{
                                    color: riskLevelColors[riskLevel],
                                    backgroundColor: riskLevelColors[riskLevel] + "18",
                                    border: `1px solid ${riskLevelColors[riskLevel]}30`,
                                  }}
                                >
                                  {riskLevel}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSelectBU(row.buId); }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-cyan-500/10"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>{language === "id" ? "Lihat Detail" : "View Details"}</span>
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {buSummaryRows.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                      <UserCog className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">
                        {language === "id" ? `Tidak ada data risiko ${officerLabel.toLowerCase()}` : `No ${officerLabel.toLowerCase()} risk data available`}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MODE 2: SPECIFIC BUSINESS UNIT — Officer Detail View
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 pb-10">
      {/* Back navigation */}
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={handleBackToOverview}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          <span>{language === "id" ? "Kembali ke Ringkasan" : "Back to Summary"}</span>
        </button>
        {activeBU && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeBU.color }} />
            <span className="text-xs font-semibold text-white">{activeBU.name}</span>
            <span className="text-[10px] text-slate-500">({activeBU.code})</span>
          </div>
        )}
      </div>

      <PageHeader
        title={activeBU
          ? `Kecerdasan Anomali ${officerLabel} — ${activeBU.name}`
          : `${officerLabel} Anomaly Intelligence`
        }
        subtitle={activeBU
          ? (language === "id"
            ? `Peringkat risiko ${officerLabel.toLowerCase()} ${activeBU.name} (${activeBU.code}) • Sektor ${sectorMeta[activeBU.sector].labelId}`
            : `${officerLabel} risk ranking for ${activeBU.name} (${activeBU.code}) • ${sectorMeta[activeBU.sector].label} Sector`)
          : t("ri.custSubtitle")
        }
        actions={[
          { label: t("ri.btnReviewOfficer"), variant: "default", onClick: handleReviewOfficer },
          { label: t("ri.btnSupervisoryReport"), onClick: handleSupervisoryReport },
        ]}
      />

      {/* Officer Risk Overview Chart */}
      <Card>
        <CardHeader><CardTitle>{language === "id" ? `Metrik Penanganan ${officerLabel}` : `${officerLabel} Handling Metrics`}</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topOfficerChart}>
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={16} name="Risk Score">
                {topOfficerChart.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
              <Bar dataKey="gap" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} name="Supervisory Gap" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Officer Table */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>{language === "id" ? `Peringkat Risiko ${officerLabel}` : `${officerLabel} Risk Ranking`}</CardTitle>
              <div className="ml-auto">
                <input
                  type="text" placeholder={t("ri.search")} value={search} onChange={e => setSearch(e.target.value)}
                  className="h-8 w-48 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0b1739] z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
                  <tr className="text-left">
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{officerLabel}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.position")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{branchLabel}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.score")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.level")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.anomalies")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.supervisoryGap")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.trend")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((o, idx) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-b border-white/5 cursor-pointer transition ${selected?.id === o.id ? "bg-cyan-500/10" : "hover:bg-white/[0.02]"}`}
                      onClick={() => setSelected(o)}
                    >
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm font-medium text-white">{o.officerName}</div>
                        <div className="text-[10px] text-slate-500">{o.officerId}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-300">{o.position}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-300">{o.outletName}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-sm font-bold" style={{ color: o.totalScore >= 80 ? "#ef4444" : o.totalScore >= 60 ? "#f59e0b" : o.totalScore >= 35 ? "#eab308" : "#22c55e" }}>
                          {o.totalScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><RiskLevelIndicator level={o.riskLevel} /></td>
                      <td className="px-3 py-2.5 text-xs text-slate-300 font-mono">{o.anomalyCount}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-mono font-bold ${o.supervisoryGapScore > 20 ? "text-rose-400" : o.supervisoryGapScore > 10 ? "text-amber-400" : "text-emerald-400"}`}>
                          {o.supervisoryGapScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${o.trendDirection === "UP" ? "text-rose-400" : o.trendDirection === "DOWN" ? "text-emerald-400" : "text-slate-400"}`}>
                          {o.trendDirection === "UP" ? <ArrowUpRight className="h-3 w-3" /> : o.trendDirection === "DOWN" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {o.trend > 0 ? "+" : ""}{o.trend}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <CardContent className="flex flex-col items-center gap-4 pt-6">
                  <RiskScoreGauge score={selected.totalScore} size={110} />
                  <div className="text-center">
                    <div className="text-sm font-semibold text-white">{selected.officerName}</div>
                    <div className="text-xs text-slate-400">{selected.position}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{selected.outletName} • {selected.branchName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full text-center">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-cyan-300">{selected.handledTransactions}</div>
                      <div className="text-[10px] text-slate-500">{t("ri.handledTxn")}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-amber-300">{selected.anomalyCount}</div>
                      <div className="text-[10px] text-slate-500">{t("ri.anomalies")}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2 col-span-2">
                      <div className={`text-lg font-bold font-mono ${selected.supervisoryGapScore > 20 ? "text-rose-400" : "text-emerald-400"}`}>
                        {selected.supervisoryGapScore}/40
                      </div>
                      <div className="text-[10px] text-slate-500">{t("ri.supervisoryGap")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>{t("ri.anomalies")}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {selected.breakdown.items.map(item => (
                    <div key={item.ruleCode} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="flex items-center gap-2">
                        <AnomalyRuleBadge code={item.ruleCode} />
                        <span className="text-xs text-slate-300">{item.occurrences}x</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-cyan-300">{item.weightedScore}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCog className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">
                  {language === "id" ? `Pilih ${officerLabel.toLowerCase()} untuk melihat detail` : `Select an ${officerLabel.toLowerCase()} to view details`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Floating Interactive AI Risk Copilot */}
      <AIRiskCopilotDrawer />
    </div>
  );
}
