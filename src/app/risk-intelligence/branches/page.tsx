"use client";

import { useMemo, useState, useEffect } from "react";
import { Building2, ArrowUpRight, ArrowDownRight, Minus, Sparkles, Loader2, Brain, AlertTriangle, ShieldAlert, BarChart3, ChevronRight, Eye, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU, useActiveSector } from "@/hooks/use-business-unit";
import { businessUnits, sectorMeta } from "@/lib/business-units";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { RiskScoreGauge } from "@/components/risk-intelligence/risk-score-gauge";
import { formatIDR } from "@/lib/engines/scoring-engine";
import { AIRiskCopilotDrawer } from "@/components/risk-intelligence/ai-risk-copilot-drawer";
import type { BranchRiskProfile, RiskLevel, SectorType } from "@/types/risk-intelligence";

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

export default function BranchRiskPage() {
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
  const [selected, setSelected] = useState<BranchRiskProfile | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [execSummary, setExecSummary] = useState<string | null>(null);
  const [execSummaryLoading, setExecSummaryLoading] = useState(false);

  const isDetailMode = !!validBUId;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const url = `/api/risk-intelligence` + (validBUId ? `?buId=${validBUId}` : ``);

    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch branch data");
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
          setError(err.message || "Failed to load branch data");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [validBUId]);

  useEffect(() => {
    if (data && !execSummary && !execSummaryLoading && !isDetailMode) {
      setExecSummaryLoading(true);
      
      const branchSummaryData = (data.branchRiskProfiles || []).map((b: any) => ({
        cabang: b.branchName,
        region: b.regionName,
        skor: b.totalScore,
        level: b.riskLevel,
        anomali: b.anomalyCount
      })).sort((a: any, b: any) => b.skor - a.skor).slice(0, 20);

      fetch("/api/ai/summarize-branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchSummaryData })
      })
      .then(res => res.json())
      .then(result => {
        if (result.summary) setExecSummary(result.summary);
      })
      .catch(err => console.error(err))
      .finally(() => setExecSummaryLoading(false));
    }
  }, [data, execSummary, execSummaryLoading, isDetailMode]);

  // Dynamic terminology
  const branchLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Kantor/Cabang" : "Branch/Outlet";
    return sectorMeta[activeSector].entityLabels.branch[language];
  }, [activeSector, language]);

  const customerLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Nasabah/Debitur/Pembeli" : "Customer/Debtor/Buyer";
    return sectorMeta[activeSector].entityLabels.customer[language];
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
    if (!data) return { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgScore: 0 };
    const all = data.branchRiskProfiles || [];
    const total = all.length;
    const critical = all.filter((b: any) => b.riskLevel === "CRITICAL").length;
    const high = all.filter((b: any) => b.riskLevel === "HIGH").length;
    const medium = all.filter((b: any) => b.riskLevel === "MEDIUM").length;
    const low = all.filter((b: any) => b.riskLevel === "LOW").length;
    const avgScore = total > 0 ? Math.round(all.reduce((s: number, b: any) => s + b.totalScore, 0) / total) : 0;
    return { total, critical, high, medium, low, avgScore };
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
    const profiles = data.branchRiskProfiles || [];

    const buMap = new Map<string, {
      buId: string; buName: string; buCode: string;
      sector: SectorType; color: string; icon: string;
      total: number; critical: number; high: number; medium: number; low: number;
      totalScore: number; totalAnomalies: number;
    }>();

    for (const bu of businessUnits) {
      buMap.set(bu.id, {
        buId: bu.id, buName: bu.name, buCode: bu.code,
        sector: bu.sector, color: bu.color, icon: sectorMeta[bu.sector].icon,
        total: 0, critical: 0, high: 0, medium: 0, low: 0,
        totalScore: 0, totalAnomalies: 0,
      });
    }

    for (const b of profiles) {
      let matchedBuId: string | null = null;
      if (buMap.has(b.businessUnitId)) {
        matchedBuId = b.businessUnitId;
      } else {
        const sectorBUs = businessUnits.filter(bu => bu.sector === b.sector);
        if (sectorBUs.length > 0) matchedBuId = sectorBUs[0].id;
      }

      if (matchedBuId && buMap.has(matchedBuId)) {
        const row = buMap.get(matchedBuId)!;
        row.total++;
        row.totalScore += b.totalScore;
        row.totalAnomalies += b.anomalyCount || 0;
        if (b.riskLevel === "CRITICAL") row.critical++;
        else if (b.riskLevel === "HIGH") row.high++;
        else if (b.riskLevel === "MEDIUM") row.medium++;
        else row.low++;
      }
    }

    return Array.from(buMap.values())
      .filter(row => row.total > 0)
      .sort((a, b) => (b.critical + b.high) - (a.critical + a.high))
      .slice(0, 10);
  }, [data]);

  // ─── Detail Mode Computations ─────────────────────────────────────
  const sorted = useMemo(() => {
    if (!data || !isDetailMode) return [];
    return [...(data.branchRiskProfiles || [])]
      .sort((a: any, b: any) => b.totalScore - a.totalScore)
      .filter((b: any) => {
        if (search && !b.outletName.toLowerCase().includes(search.toLowerCase()) && !b.branchName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
  }, [search, data, isDetailMode]);

  // Bar chart comparison data
  const comparisonData = useMemo(() => {
    if (!data || !isDetailMode) return [];
    const avgByRegion = new Map<string, { sum: number; count: number }>();
    for (const b of data.branchRiskProfiles || []) {
      const entry = avgByRegion.get(b.regionName) || { sum: 0, count: 0 };
      entry.sum += b.totalScore;
      entry.count++;
      avgByRegion.set(b.regionName, entry);
    }
    return sorted.slice(0, 15).map(b => {
      const regional = avgByRegion.get(b.regionName);
      return {
        name: b.outletCode,
        score: b.totalScore,
        regional: regional ? Math.round(regional.sum / regional.count) : 0,
      };
    });
  }, [sorted, data, isDetailMode]);

  // Historical trend for selected branch
  const branchHistory = useMemo(() => {
    if (!selected || !data) return [];
    return (data.riskScoreHistory || [])
      .filter((h: any) => h.entityId === selected.outletCode)
      .sort((a: any, b: any) => a.snapshotDate.localeCompare(b.snapshotDate));
  }, [selected, data]);

  const handleGenerateAI = async () => {
    if (!selected || !data) return;
    setAiLoading(true);
    try {
      const branchAnomalies = (data.anomalyDetections || [])
        .filter((a: any) => a.outletCode === selected.outletCode)
        .sort((a: any, b: any) => b.riskScore - a.riskScore)
        .slice(0, 5)
        .map((a: any) => `- [Score: ${a.riskScore}] ${a.ruleName}: ${a.description}`)
        .join("\n");

      const databaseDump = (data.anomalyDetections || []).map((a: any) => ({
        cabang: a.branchName,
        rule: a.ruleName,
        skor: a.riskScore,
        status: a.status
      }));

      const ruleFrequency: Record<string, {name: string, count: number}> = {};
      (data.anomalyDetections || []).forEach((a: any) => {
        if (!ruleFrequency[a.ruleCode]) ruleFrequency[a.ruleCode] = { name: a.ruleName, count: 0 };
        ruleFrequency[a.ruleCode].count++;
      });
      const topGlobalPatterns = Object.values(ruleFrequency)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(p => `- ${p.name} (Terjadi ${p.count} kali secara nasional)`)
        .join("\n");

      const res = await fetch("/api/ai/investigate-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          branch: selected, 
          branchAnomalies, 
          databaseDump, 
          topGlobalPatterns 
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || "Failed to generate AI recommendation");
      }
      const result = await res.json();
      setAiRecommendation(result.recommendation);
    } catch (err: any) {
      console.error(err);
      alert((language === "id" ? "Gagal memanggil AI: " : "Failed to call AI: ") + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCompare = () => {
    alert(`Regional Branch Comparison:\n\nActive Branch: ${selected ? selected.branchName : "None selected"}\nRegional Average Risk Score: 64\nBranch Risk Score: ${selected ? selected.totalScore : "N/A"}\nStatus: ${selected ? (selected.totalScore > 64 ? "Above Regional Average (Needs Review)" : "Below Regional Average (Healthy)") : "Select a branch to compare"}`);
  };

  const handleDrillDown = () => {
    alert(`Drilling down into branch ${selected ? selected.branchName : "details"}:\n\n- Active Anomalies: ${selected ? selected.anomalyCount : 0}\n- High Risk Customers: ${selected ? selected.highRiskCustomerCount : 0}\n- Customers: ${selected ? selected.customerCount : "N/A"}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
        <p className="text-sm text-slate-400">{language === "id" ? "Memuat data cabang..." : "Loading branch data..."}</p>
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
          title={language === "id" ? "Branch Risk — Ringkasan Eksekutif" : "Branch Risk — Executive Summary"}
          subtitle={language === "id"
            ? "Tampilan strategis risiko cabang seluruh Business Unit. Pilih Business Unit untuk melihat detail operasional."
            : "Strategic branch risk overview across all Business Units. Select a Business Unit for operational details."
          }
        />

        {/* ─── KPI Summary Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <KPICard
            icon={Building2}
            label={language === "id" ? "Total Cabang Berisiko" : "Total Risk Branches"}
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
            subtitle={language === "id" ? "Audit khusus segera" : "Immediate special audit"}
          />
          <KPICard
            icon={ShieldAlert}
            label="High Risk"
            value={overviewMetrics.high}
            color="#f97316"
            delay={0.1}
            subtitle={language === "id" ? "Pengawasan ketat" : "Tight monitoring"}
          />
          <KPICard
            icon={BarChart3}
            label="Medium Risk"
            value={overviewMetrics.medium}
            color="#eab308"
            delay={0.15}
          />
          <KPICard
            icon={Building2}
            label="Low Risk"
            value={overviewMetrics.low}
            color="#22c55e"
            delay={0.2}
          />
        </div>

        {/* ─── AI Executive Summary ──────────────────────────────────── */}
        {(execSummaryLoading || execSummary) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Card className="border-cyan-500/30 bg-gradient-to-br from-[#0f172a] via-[#0b1429] to-[#0b1739] shadow-lg shadow-cyan-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Sparkles className="w-24 h-24 text-cyan-400" />
              </div>
              <CardContent className="p-5 flex gap-4 items-start relative z-10">
                <div className="mt-1 flex-shrink-0 bg-cyan-500/20 p-2 rounded-lg border border-cyan-500/30">
                  {execSummaryLoading ? <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /> : <Brain className="w-5 h-5 text-cyan-400" />}
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-cyan-50 text-sm flex items-center gap-2">
                    Executive AI Summary
                    {execSummaryLoading && <span className="text-[10px] uppercase tracking-wider text-cyan-400/70 font-mono bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800">Generating...</span>}
                  </h3>
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-w-4xl">
                    {execSummaryLoading ? "Sedang mengevaluasi kondisi seluruh cabang secara nasional..." : execSummary}
                  </div>
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
                  <span>{language === "id" ? "Distribusi Risiko Cabang" : "Branch Risk Distribution"}</span>
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
                    <span>{language === "id" ? "Top 10 Business Unit — High Risk Branch" : "Top 10 Business Units — High Risk Branches"}</span>
                  </CardTitle>
                  <span className="text-xs text-slate-400">
                    {language === "id"
                      ? "Diurutkan berdasarkan jumlah cabang Critical + High"
                      : "Sorted by Critical + High branch count"}
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
                          {language === "id" ? "Total Cabang" : "Total Branches"}
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
                      <Building2 className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">
                        {language === "id" ? "Tidak ada data risiko cabang" : "No branch risk data available"}
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
  // MODE 2: SPECIFIC BUSINESS UNIT — Branch Detail View
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
          ? `Kecerdasan Anomali ${branchLabel} — ${activeBU.name}`
          : `${branchLabel} Anomaly Intelligence`
        }
        subtitle={activeBU
          ? (language === "id"
            ? `Papan peringkat risiko ${branchLabel.toLowerCase()} ${activeBU.name} (${activeBU.code}) • Sektor ${sectorMeta[activeBU.sector].labelId}`
            : `${branchLabel} risk leaderboard for ${activeBU.name} (${activeBU.code}) • ${sectorMeta[activeBU.sector].label} Sector`)
          : t("ri.custSubtitle")
        }
        actions={[
          { label: t("ri.btnCompare"), variant: "default", onClick: handleCompare },
          { label: t("ri.btnDrillDown"), onClick: handleDrillDown },
        ]}
      />

      {/* Comparison Chart */}
      <Card>
        <CardHeader><CardTitle>{language === "id" ? `${branchLabel} vs Rata-rata Regional` : `${branchLabel} vs Regional Avg`}</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData}>
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="score" fill="#22d3ee" radius={[4, 4, 0, 0]} barSize={16} name={`${branchLabel} Score`} />
              <Bar dataKey="regional" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} name="Regional Avg" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Branch Leaderboard */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>{language === "id" ? `Papan Peringkat Risiko ${branchLabel}` : `${branchLabel} Risk Leaderboard`}</CardTitle>
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
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{branchLabel}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.region")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.score")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.level")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.anomalies")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.density")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{language === "id" ? `${customerLabel} Risiko Tinggi` : `High Risk ${customerLabel}`}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.trend")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b, idx) => (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-b border-white/5 cursor-pointer transition ${selected?.id === b.id ? "bg-cyan-500/10" : "hover:bg-white/[0.02]"}`}
                      onClick={() => {
                        setSelected(b);
                        setAiRecommendation(null);
                      }}
                    >
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm font-medium text-white">{b.outletName}</div>
                        <div className="text-[10px] text-slate-500">{b.outletCode} • {b.branchName}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-300">{b.regionName}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-sm font-bold" style={{ color: b.totalScore >= 80 ? "#ef4444" : b.totalScore >= 60 ? "#f59e0b" : b.totalScore >= 35 ? "#eab308" : "#22c55e" }}>
                          {b.totalScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><RiskLevelIndicator level={b.riskLevel} /></td>
                      <td className="px-3 py-2.5 text-xs text-slate-300 font-mono">{b.anomalyCount}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-300 font-mono">{b.anomalyDensity}/100</td>
                      <td className="px-3 py-2.5 text-xs text-rose-400 font-mono">{b.highRiskCustomerCount}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${b.trendDirection === "UP" ? "text-rose-400" : b.trendDirection === "DOWN" ? "text-emerald-400" : "text-slate-400"}`}>
                          {b.trendDirection === "UP" ? <ArrowUpRight className="h-3 w-3" /> : b.trendDirection === "DOWN" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {b.trend > 0 ? "+" : ""}{b.trend}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Branch Detail */}
        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader><CardTitle>{language === "id" ? `Detail ${branchLabel}` : `${branchLabel} Detail`}</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <RiskScoreGauge score={selected.totalScore} size={110} />
                  <div className="text-center">
                    <div className="text-sm font-semibold text-white">{selected.outletName}</div>
                    <div className="text-xs text-slate-400">{selected.regionName} • {selected.areaName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full text-center">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-cyan-300">{selected.customerCount}</div>
                      <div className="text-[10px] text-slate-500">{customerLabel}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-amber-300">{selected.anomalyCount}</div>
                      <div className="text-[10px] text-slate-500">{t("ri.anomalies")}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-violet-300">{selected.transactionVolume}</div>
                      <div className="text-[10px] text-slate-500">{t("ri.transactions")}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-emerald-300">{formatIDR(selected.totalPortfolioValue)}</div>
                      <div className="text-[10px] text-slate-500">{t("ri.portfolio")}</div>
                    </div>
                  </div>

                  {/* AI Investigator Button */}
                  <div className="w-full mt-4">
                    <button
                      onClick={handleGenerateAI}
                      disabled={aiLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 transition-all"
                    >
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {language === "id" ? "Analisis Kesehatan Cabang & Rencana Audit" : "Analyze Branch Health & Audit Plan"}
                    </button>
                  </div>

                  {aiRecommendation && (
                    <div className="w-full mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-inner backdrop-blur-md">
                      <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        <h4 className="font-semibold text-sm text-cyan-50">AI Investigator Insight</h4>
                      </div>
                      <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {aiRecommendation}
                      </div>
                    </div>
                  )}
                  
                </CardContent>
              </Card>

              {branchHistory.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>{t("ri.trend")}</CardTitle></CardHeader>
                  <CardContent className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={branchHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="periodLabel" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip {...tooltipStyle} />
                        <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} dot={{ fill: "#22d3ee", r: 3 }} name="Risk Score" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">
                  {language === "id" ? `Pilih ${branchLabel.toLowerCase()} untuk melihat detail` : `Select a ${branchLabel.toLowerCase()} to view details`}
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
