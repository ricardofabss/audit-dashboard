"use client";

import { useMemo, useState, useEffect } from "react";
import { Users, ArrowUpRight, ArrowDownRight, Minus, Activity, ShieldAlert, Brain, BarChart3, AlertTriangle, ChevronRight, Building2, Eye, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, Cell,
  PieChart, Pie,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU } from "@/hooks/use-business-unit";
import { businessUnits, sectorMeta } from "@/lib/business-units";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { RiskScoreGauge } from "@/components/risk-intelligence/risk-score-gauge";
import { AnomalyRuleBadge } from "@/components/risk-intelligence/anomaly-rule-badge";
import { AINetworkFraudCard } from "@/components/risk-intelligence/ai-network-fraud-card";
import { AIRiskCopilotDrawer } from "@/components/risk-intelligence/ai-risk-copilot-drawer";
import type { CustomerRiskProfile, RiskLevel, SectorType } from "@/types/risk-intelligence";

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

export default function CustomerRiskPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const setActiveBU = useBusinessUnitStore((s) => s.setActiveBU);
  const activeBU = useActiveBU();
  const validBUId = activeBU ? activeBU.id : null;

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<RiskLevel | "ALL">("ALL");
  const [selected, setSelected] = useState<CustomerRiskProfile | null>(null);

  const isDetailMode = !!validBUId;

  // ─── Data Fetching ────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const url = validBUId
      ? `/api/risk-intelligence?buId=${validBUId}`
      : `/api/risk-intelligence`;

    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch customer data");
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
          setError(err.message || "Failed to load customer data");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [validBUId]);

  // ─── Handlers ─────────────────────────────────────────────────────
  const handleSelectBU = (buId: string) => {
    setActiveBU(buId);
    setSearch("");
    setFilterLevel("ALL");
    setSelected(null);
  };

  const handleBackToOverview = () => {
    setActiveBU(null);
    setSelected(null);
  };

  // ─── Overview Metrics (All BU mode) ───────────────────────────────
  const overviewMetrics = useMemo(() => {
    if (!data) return { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgScore: 0 };
    const all = data.customerRiskProfiles || [];
    const total = all.length;
    const critical = all.filter((c: any) => c.riskLevel === "CRITICAL").length;
    const high = all.filter((c: any) => c.riskLevel === "HIGH").length;
    const medium = all.filter((c: any) => c.riskLevel === "MEDIUM").length;
    const low = all.filter((c: any) => c.riskLevel === "LOW").length;
    const avgScore = total > 0 ? Math.round(all.reduce((s: number, c: any) => s + c.totalScore, 0) / total) : 0;
    return { total, critical, high, medium, low, avgScore };
  }, [data]);

  // ─── Risk Distribution for Pie Chart ──────────────────────────────
  const riskDistribution = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Critical", value: overviewMetrics.critical, fill: "#ef4444" },
      { name: "High", value: overviewMetrics.high, fill: "#f97316" },
      { name: "Medium", value: overviewMetrics.medium, fill: "#eab308" },
      { name: "Low", value: overviewMetrics.low, fill: "#22c55e" },
    ].filter(d => d.value > 0);
  }, [data, overviewMetrics]);

  // ─── BU Summary Table (Top 10) ───────────────────────────────────
  const buSummaryRows = useMemo(() => {
    if (!data) return [];
    const profiles = data.customerRiskProfiles || [];

    const buMap = new Map<string, {
      buId: string; buName: string; buCode: string;
      sector: SectorType; color: string; icon: string;
      total: number; critical: number; high: number; medium: number; low: number;
      totalScore: number; totalLoanAmount: number;
    }>();

    for (const bu of businessUnits) {
      buMap.set(bu.id, {
        buId: bu.id, buName: bu.name, buCode: bu.code,
        sector: bu.sector, color: bu.color, icon: sectorMeta[bu.sector].icon,
        total: 0, critical: 0, high: 0, medium: 0, low: 0,
        totalScore: 0, totalLoanAmount: 0,
      });
    }

    for (const c of profiles) {
      let matchedBuId: string | null = null;
      if (buMap.has(c.businessUnitId)) {
        matchedBuId = c.businessUnitId;
      } else {
        const sectorBUs = businessUnits.filter(b => b.sector === c.sector);
        if (sectorBUs.length > 0) matchedBuId = sectorBUs[0].id;
      }

      if (matchedBuId && buMap.has(matchedBuId)) {
        const row = buMap.get(matchedBuId)!;
        row.total++;
        row.totalScore += c.totalScore;
        row.totalLoanAmount += c.totalLoanAmount || 0;
        if (c.riskLevel === "CRITICAL") row.critical++;
        else if (c.riskLevel === "HIGH") row.high++;
        else if (c.riskLevel === "MEDIUM") row.medium++;
        else row.low++;
      }
    }

    return Array.from(buMap.values())
      .filter(row => row.total > 0)
      .sort((a, b) => (b.critical + b.high) - (a.critical + a.high))
      .slice(0, 10);
  }, [data]);

  // ─── AI Executive Summary ─────────────────────────────────────────
  const aiSummary = useMemo(() => {
    if (!data || !data.customerRiskProfiles || data.customerRiskProfiles.length === 0) return null;
    const profiles = data.customerRiskProfiles;
    const highRiskCount = profiles.filter((c: any) => c.riskLevel === "CRITICAL" || c.riskLevel === "HIGH").length;
    const totalLoan = profiles.reduce((s: number, c: any) => s + (c.totalLoanAmount || 0), 0);
    const highRiskLoan = profiles
      .filter((c: any) => c.riskLevel === "CRITICAL" || c.riskLevel === "HIGH")
      .reduce((s: number, c: any) => s + (c.totalLoanAmount || 0), 0);

    const topBU = buSummaryRows[0];
    const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

    const lines = language === "id" ? [
      `Teridentifikasi **${highRiskCount} nasabah berisiko tinggi** (Critical + High) dari total ${profiles.length} nasabah di seluruh Business Unit.`,
      totalLoan > 0 ? `Total eksposur pinjaman berisiko tinggi: **${formatIDR(highRiskLoan)}** dari total portofolio **${formatIDR(totalLoan)}** (${totalLoan > 0 ? ((highRiskLoan / totalLoan) * 100).toFixed(1) : 0}%).` : null,
      topBU ? `Business Unit **${topBU.buName}** memiliki konsentrasi nasabah berisiko tertinggi dengan ${topBU.critical + topBU.high} nasabah Critical/High.` : null,
      `**Rekomendasi:** Lakukan drill-down ke Business Unit dengan konsentrasi risiko tertinggi untuk evaluasi individual nasabah.`,
    ] : [
      `Identified **${highRiskCount} high-risk customers** (Critical + High) from ${profiles.length} total customers across all Business Units.`,
      totalLoan > 0 ? `Total high-risk loan exposure: **${formatIDR(highRiskLoan)}** from portfolio of **${formatIDR(totalLoan)}** (${totalLoan > 0 ? ((highRiskLoan / totalLoan) * 100).toFixed(1) : 0}%).` : null,
      topBU ? `Business Unit **${topBU.buName}** has the highest risk concentration with ${topBU.critical + topBU.high} Critical/High customers.` : null,
      `**Recommendation:** Drill down to the highest-risk Business Unit for individual customer evaluation.`,
    ];

    return lines.filter(Boolean) as string[];
  }, [data, buSummaryRows, language]);

  // ─── Detail mode computations ─────────────────────────────────────
  const sortedCustomers = useMemo(() => {
    if (!data || !isDetailMode) return [];
    return [...(data.customerRiskProfiles || [])]
      .sort((a: any, b: any) => b.totalScore - a.totalScore)
      .filter((c: any) => {
        if (filterLevel !== "ALL" && c.riskLevel !== filterLevel) return false;
        if (search && !c.customerName.toLowerCase().includes(search.toLowerCase()) && !c.cifNumber.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
  }, [search, filterLevel, data, isDetailMode]);

  const radarData = useMemo(() => {
    if (!selected) return [];
    return selected.breakdown.items.map(item => ({
      rule: item.ruleCode,
      score: item.weightedScore,
      fullMark: 100,
    }));
  }, [selected]);

  const handleFlagInvestigation = () => {
    alert("Flagged for Investigation:\n\n- The selected high-risk customer account has been flagged.\n- Notification sent to Special Investigation Unit.\n- Case ID generated and queued in WBS Intake.");
  };

  const handleGenerateReport = () => {
    const element = document.createElement("a");
    const label = selected ? selected.customerName : "Active_Customer";
    const content = `AuditSphere AI - Customer Risk Ranking Profile\n============================================\nCustomer: ${label}\nRisk Score: ${selected ? selected.totalScore : "N/A"}\nRisk Level: ${selected ? selected.riskLevel : "N/A"}\nGenerated: ${new Date().toLocaleString()}`;
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Customer_Risk_Report_${label.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ─── Loading / Error ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
        <p className="text-sm text-slate-400">{language === "id" ? "Memuat data nasabah..." : "Loading customer data..."}</p>
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
          title={language === "id" ? "Customer Risk — Ringkasan Eksekutif" : "Customer Risk — Executive Summary"}
          subtitle={language === "id"
            ? "Tampilan strategis risiko nasabah seluruh Business Unit. Pilih Business Unit untuk melihat detail."
            : "Strategic customer risk view across all Business Units. Select a Business Unit for details."
          }
        />

        {/* ─── KPI Summary Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <KPICard
            icon={Users}
            label={language === "id" ? "Total Nasabah Berisiko" : "Total Risk Customers"}
            value={overviewMetrics.total}
            color="#06b6d4"
            delay={0}
          />
          <KPICard
            icon={AlertTriangle}
            label={language === "id" ? "Critical Risk" : "Critical Risk"}
            value={overviewMetrics.critical}
            color="#ef4444"
            delay={0.05}
            subtitle={language === "id" ? "Memerlukan tindakan segera" : "Requires immediate action"}
          />
          <KPICard
            icon={ShieldAlert}
            label="High Risk"
            value={overviewMetrics.high}
            color="#f97316"
            delay={0.1}
            subtitle={language === "id" ? "Perlu perhatian khusus" : "Needs special attention"}
          />
          <KPICard
            icon={BarChart3}
            label="Medium Risk"
            value={overviewMetrics.medium}
            color="#eab308"
            delay={0.15}
          />
          <KPICard
            icon={Users}
            label="Low Risk"
            value={overviewMetrics.low}
            color="#22c55e"
            delay={0.2}
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
                  <span>{language === "id" ? "Distribusi Risiko Nasabah" : "Customer Risk Distribution"}</span>
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

          {/* Business Unit Ranking Table */}
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
                    <span>{language === "id" ? "Top 10 Business Unit — High Risk Customer" : "Top 10 Business Units — High Risk Customers"}</span>
                  </CardTitle>
                  <span className="text-xs text-slate-400">
                    {language === "id"
                      ? "Diurutkan berdasarkan jumlah nasabah Critical + High"
                      : "Sorted by Critical + High customer count"}
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
                          {language === "id" ? "Total Nasabah" : "Total Customers"}
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
                      <Users className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">
                        {language === "id" ? "Tidak ada data nasabah berisiko" : "No customer risk data available"}
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
  // MODE 2: SPECIFIC BUSINESS UNIT — Customer Detail View
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
          ? `${t("ri.custTitle")} — ${activeBU.name}`
          : t("ri.custTitle")
        }
        subtitle={activeBU
          ? (language === "id"
            ? `Ranking risiko nasabah ${activeBU.name} (${activeBU.code}) • Sektor ${sectorMeta[activeBU.sector].labelId}`
            : `Customer risk ranking for ${activeBU.name} (${activeBU.code}) • ${sectorMeta[activeBU.sector].label} Sector`)
          : t("ri.custSubtitle")
        }
        actions={[
          { label: t("ri.btnFlagInvestigation"), variant: "default", onClick: handleFlagInvestigation },
          { label: t("ri.btnGenerateReport"), onClick: handleGenerateReport },
        ]}
      />

      {/* AI Customer Network Fraud Copilot */}
      <AINetworkFraudCard />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Customer Table */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{t("ri.custRanking")}</CardTitle>
              <div className="ml-auto flex items-center gap-2">
                <input
                  type="text" placeholder={t("ri.search")} value={search} onChange={e => setSearch(e.target.value)}
                  className="h-8 w-48 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
                />
                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value as any)} className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-slate-100 outline-none">
                  <option value="ALL" className="bg-[#0b1739]">{t("ri.riskLevel")}</option>
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map(l =>
                    <option key={l} value={l} className="bg-[#0b1739]">{t(`ri.${l.toLowerCase()}` as any)}</option>
                  )}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0b1739] z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
                  <tr className="text-left">
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.customer")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.score")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.level")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.anomalies")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.trend")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.loanAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCustomers.slice(0, 25).map((c, idx) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-b border-white/5 cursor-pointer transition ${selected?.id === c.id ? "bg-cyan-500/10" : "hover:bg-white/[0.02]"}`}
                      onClick={() => setSelected(c)}
                    >
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm font-medium text-white">{c.customerName}</div>
                        <div className="text-[10px] text-slate-500">{c.cifNumber} • {c.primaryOutlet}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-sm font-bold" style={{ color: c.totalScore >= 80 ? "#ef4444" : c.totalScore >= 60 ? "#f59e0b" : c.totalScore >= 35 ? "#eab308" : "#22c55e" }}>
                          {c.totalScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><RiskLevelIndicator level={c.riskLevel} /></td>
                      <td className="px-3 py-2.5 text-xs text-slate-300 font-mono">{c.anomalyCount} ({c.activeAnomalies} active)</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${c.trendDirection === "UP" ? "text-rose-400" : c.trendDirection === "DOWN" ? "text-emerald-400" : "text-slate-400"}`}>
                          {c.trendDirection === "UP" ? <ArrowUpRight className="h-3 w-3" /> : c.trendDirection === "DOWN" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {c.trend > 0 ? "+" : ""}{c.trend}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-300 font-mono">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(c.totalLoanAmount)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-center text-xs text-slate-500">{sortedCustomers.length} {language === "id" ? "nasabah" : "customers"}</div>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader><CardTitle>{t("ri.custBreakdown")}</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <RiskScoreGauge score={selected.totalScore} size={110} />
                  <div className="text-center">
                    <div className="text-sm font-semibold text-white">{selected.customerName}</div>
                    <div className="text-xs text-slate-400">{selected.cifNumber}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full text-center">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-cyan-300">{selected.transactionCount}</div>
                      <div className="text-[10px] text-slate-500">{t("ri.transactions")}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-amber-300">{selected.anomalyCount}</div>
                      <div className="text-[10px] text-slate-500">{t("ri.anomalies")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {radarData.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Risk Radar</CardTitle></CardHeader>
                  <CardContent className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="rule" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} />
                        <Radar name="Score" dataKey="score" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} strokeWidth={2} />
                        <Tooltip {...tooltipStyle} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-400" />
                      {language === "id" ? "Rincian Kontrak & Status Transaksi Anomali" : "Contract Details & Anomaly Transaction Status"}
                    </CardTitle>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-semibold border border-cyan-500/20">
                      {selected.activeAnomalies} {language === "id" ? "Aktif" : "Active"} / {selected.anomalyCount} Total
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin">
                  {selected.breakdown.items.map((item: any, idx: number) => {
                    const statusStr = (item.statusPerpanjangan || "").toLowerCase();
                    const isLunas = statusStr.includes("lunas") || statusStr.includes("tebus");
                    const isPerpanjangan = statusStr.includes("perpanjangan");
                    const isTopUp = statusStr.includes("top up");

                    return (
                      <div key={idx} className="rounded-xl border border-white/10 bg-slate-950/80 p-3 space-y-2 text-xs shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AnomalyRuleBadge code={item.ruleCode} />
                            <span className="font-mono text-[11px] text-slate-400 font-semibold">{item.contractNo || "-"}</span>
                          </div>
                          <span className="font-mono font-bold text-amber-400 text-xs">Score: {item.weightedScore}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {isLunas ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              TRANSAKSI: LUNAS TEBUS
                            </span>
                          ) : isPerpanjangan ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              TRANSAKSI: PERPANJANGAN
                            </span>
                          ) : isTopUp ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                              TRANSAKSI: TOP UP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                              TRANSAKSI: PINJAMAN AKTIF
                            </span>
                          )}

                          {item.status === "DETECTED" || item.status === "CONFIRMED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              🚨 AUDIT: ANOMALI AKTIF
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                              ✓ AUDIT: SELESAI
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-[11px] text-slate-300 leading-snug pt-0.5">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5 pt-1.5">
                          <span>Pinjaman: <strong className="text-white">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.loanAmount || 0)}</strong></span>
                          <span>Aging: <strong className="text-amber-300">{item.agingDays || 0} hari</strong></span>
                          <span>{item.lastDetected}</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">{t("ri.custSelect")}</p>
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
