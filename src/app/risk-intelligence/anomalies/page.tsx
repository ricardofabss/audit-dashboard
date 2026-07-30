"use client";

import { useMemo, useState, useEffect } from "react";
import { Zap, Sparkles, AlertTriangle, ShieldAlert, ShieldCheck, BarChart3, Brain, ChevronRight, Building2, Eye } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

import { useBusinessUnitStore, useActiveBU } from "@/hooks/use-business-unit";
import { businessUnits, sectorMeta } from "@/lib/business-units";
import { AnomalyRuleBadge, getAnomalyRuleColor } from "@/components/risk-intelligence/anomaly-rule-badge";
import { AIInvestigationModal } from "@/components/risk-intelligence/ai-investigation-modal";
import { AIRiskCopilotDrawer } from "@/components/risk-intelligence/ai-risk-copilot-drawer";
import type { AnomalyRuleCode, AnomalyStatus, RiskMockDataSet, AnomalyDetection, RiskLevel, SectorType } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

const statusColors: Record<AnomalyStatus, string> = {
  DETECTED: "#ef4444", CONFIRMED: "#f59e0b", INVESTIGATING: "#3b82f6", DISMISSED: "#6b7280", RESOLVED: "#22c55e",
};

const riskLevelColors: Record<RiskLevel, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

// ─── Helper: classify risk level from score ─────────────────────────
function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

// ─── KPI Stat Card ──────────────────────────────────────────────────
function AnomalyKPICard({ icon: Icon, label, value, color, delay = 0 }: {
  icon: any; label: string; value: number | string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1429]/90 via-[#0a1122]/95 to-[#0d172e]/90 p-5 shadow-xl backdrop-blur-xl"
    >
      {/* Accent glow */}
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
          <p className="text-2xl font-bold font-mono text-white">{value}</p>
        </div>
        <div className="rounded-xl p-2.5 border border-white/10" style={{ backgroundColor: color + "15" }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function AnomalyMonitorPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const setActiveBU = useBusinessUnitStore((s) => s.setActiveBU);
  const activeBU = useActiveBU();
  const validBUId = activeBU ? activeBU.id : null;
  const [data, setData] = useState<RiskMockDataSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiRecommendations, setAiRecommendations] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // ─── Data Fetching (always fetch consolidated for overview mode) ───
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // Fetch data: consolidated (no buId) for overview, filtered for detail mode
    const url = validBUId
      ? `/api/risk-intelligence?buId=${validBUId}`
      : `/api/risk-intelligence`;

    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch anomaly data");
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
          setError(err.message || "Failed to load anomaly data");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [validBUId]);

  // ─── Anomaly Detail Filters (only active in BU detail mode) ───────
  const [filterRule, setFilterRule] = useState<AnomalyRuleCode | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<AnomalyStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [selectedAnomalyForAI, setSelectedAnomalyForAI] = useState<AnomalyDetection | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // ─── Is in BU Detail mode? ────────────────────────────────────────
  const isDetailMode = !!validBUId;

  // ─── Filtered anomalies for BU detail mode ────────────────────────
  const filtered = useMemo(() => {
    if (!data || !isDetailMode) return [];
    // API already returns sector-filtered data when buId is provided.
    // Here we only apply user-selected filters (rule, status, search, dates).
    return data.anomalyDetections
      .filter(a => {
        if (filterRule !== "ALL" && a.ruleCode !== filterRule) return false;
        if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
        if (search && !a.entityName.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
        if (startDate && a.detectedAt < startDate) return false;
        if (endDate && a.detectedAt > endDate) return false;
        return true;
      });
  }, [filterRule, filterStatus, search, startDate, endDate, data, isDetailMode, validBUId]);

  // ─── Consolidated Overview Computations ───────────────────────────
  const overviewMetrics = useMemo(() => {
    if (!data) return { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    const all = data.anomalyDetections;
    const total = all.length;
    const critical = all.filter(a => a.riskScore >= 80).length;
    const high = all.filter(a => a.riskScore >= 60 && a.riskScore < 80).length;
    const medium = all.filter(a => a.riskScore >= 35 && a.riskScore < 60).length;
    const low = all.filter(a => a.riskScore < 35).length;
    return { total, critical, high, medium, low };
  }, [data]);

  // ─── BU Summary Table for Overview Mode ───────────────────────────
  const buSummaryRows = useMemo(() => {
    if (!data) return [];

    // Group anomalies by businessUnitId, but also attempt to match by sector
    const buMap = new Map<string, {
      buId: string;
      buName: string;
      buCode: string;
      sector: SectorType;
      color: string;
      icon: string;
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      totalScore: number;
    }>();

    // Initialize from known BUs
    for (const bu of businessUnits) {
      buMap.set(bu.id, {
        buId: bu.id,
        buName: bu.name,
        buCode: bu.code,
        sector: bu.sector,
        color: bu.color,
        icon: sectorMeta[bu.sector].icon,
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        totalScore: 0,
      });
    }

    // Assign anomalies to their BUs
    for (const a of data.anomalyDetections) {
      // Try to find the matching BU
      let matchedBuId: string | null = null;

      // Direct match
      if (buMap.has(a.businessUnitId)) {
        matchedBuId = a.businessUnitId;
      } else {
        // Try sector-based matching — assign to first BU of that sector
        const sectorBUs = businessUnits.filter(b => b.sector === a.sector);
        if (sectorBUs.length > 0) {
          matchedBuId = sectorBUs[0].id;
        }
      }

      if (matchedBuId && buMap.has(matchedBuId)) {
        const row = buMap.get(matchedBuId)!;
        row.total++;
        row.totalScore += a.riskScore;
        if (a.riskScore >= 80) row.critical++;
        else if (a.riskScore >= 60) row.high++;
        else if (a.riskScore >= 35) row.medium++;
        else row.low++;
      }
    }

    return Array.from(buMap.values())
      .filter(row => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [data]);

  // ─── AI Executive Summary ─────────────────────────────────────────
  const aiExecutiveSummary = useMemo(() => {
    if (!data || data.anomalyDetections.length === 0) return null;

    const totalAnomalies = data.anomalyDetections.length;
    const criticalCount = data.anomalyDetections.filter(a => a.riskScore >= 80).length;
    const highCount = data.anomalyDetections.filter(a => a.riskScore >= 60 && a.riskScore < 80).length;
    const activeCount = data.anomalyDetections.filter(a => a.status === "DETECTED" || a.status === "CONFIRMED" || a.status === "INVESTIGATING").length;

    // Find the most risky BU
    const buCounts: Record<string, number> = {};
    for (const a of data.anomalyDetections) {
      if (a.riskScore >= 60) {
        const key = a.sector;
        buCounts[key] = (buCounts[key] || 0) + 1;
      }
    }
    const topSector = Object.entries(buCounts).sort((a, b) => b[1] - a[1])[0];
    const topSectorLabel = topSector ? (sectorMeta[topSector[0] as SectorType]?.labelId || topSector[0]) : "-";

    // Find top rule
    const ruleCounts: Record<string, number> = {};
    for (const a of data.anomalyDetections) {
      ruleCounts[a.ruleCode] = (ruleCounts[a.ruleCode] || 0) + 1;
    }
    const topRule = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1])[0];

    const idSummary = [
      `Terdeteksi **${totalAnomalies} anomali** secara keseluruhan di semua Business Unit.`,
      `${criticalCount} anomali berstatus **Critical** dan ${highCount} berstatus **High Risk** yang memerlukan perhatian segera.`,
      `Saat ini terdapat **${activeCount} anomali aktif** (Detected/Confirmed/Investigating) yang belum diselesaikan.`,
      topSector ? `Sektor **${topSectorLabel}** memiliki konsentrasi risiko tertinggi dengan ${topSector[1]} anomali berisiko tinggi.` : "",
      topRule ? `Rule **${topRule[0]}** menjadi penyebab anomali terbanyak (${topRule[1]} temuan).` : "",
      `**Rekomendasi:** Prioritaskan investigasi pada anomali Critical di sektor ${topSectorLabel}. Lakukan drill-down ke Business Unit terkait untuk analisis detail.`,
    ].filter(Boolean);

    const enSummary = [
      `Detected **${totalAnomalies} anomalies** across all Business Units.`,
      `${criticalCount} anomalies are **Critical** and ${highCount} are **High Risk** requiring immediate attention.`,
      `Currently **${activeCount} active anomalies** (Detected/Confirmed/Investigating) remain unresolved.`,
      topSector ? `Sector **${topSectorLabel}** has the highest risk concentration with ${topSector[1]} high-risk anomalies.` : "",
      topRule ? `Rule **${topRule[0]}** is the top anomaly trigger (${topRule[1]} findings).` : "",
      `**Recommendation:** Prioritize investigation on Critical anomalies in ${topSectorLabel} sector. Drill down to the relevant Business Unit for detailed analysis.`,
    ].filter(Boolean);

    return language === "id" ? idSummary : enSummary;
  }, [data, language]);

  // ─── Charts for detail mode ───────────────────────────────────────
  const ruleDistribution = useMemo(() => {
    if (!data || !isDetailMode) return [];
    const counts = new Map<AnomalyRuleCode, number>();
    for (const a of filtered) counts.set(a.ruleCode, (counts.get(a.ruleCode) || 0) + 1);
    return data.anomalyRules.map(r => ({
      code: r.code, name: language === "id" ? r.nameId : r.name,
      count: counts.get(r.code) || 0, fill: getAnomalyRuleColor(r.code),
    })).filter(r => r.count > 0);
  }, [language, data, filtered, isDetailMode]);

  const statusDistribution = useMemo(() => {
    if (!data || !isDetailMode) return [];
    const counts: Record<string, number> = {};
    for (const a of filtered) counts[a.status] = (counts[a.status] || 0) + 1;
    return (Object.entries(statusColors) as [AnomalyStatus, string][]).map(([status, fill]) => ({
      name: t(`ri.${status.toLowerCase()}` as any), value: counts[status] || 0, fill,
    }));
  }, [t, data, filtered, isDetailMode]);

  const statusKeys: AnomalyStatus[] = ["DETECTED", "CONFIRMED", "INVESTIGATING", "DISMISSED", "RESOLVED"];
  const ruleKeys = useMemo(() => {
    if (!data) return [];
    return data.anomalyRules.map(r => r.code);
  }, [data]);

  // ─── Handlers ─────────────────────────────────────────────────────
  const handleSelectBU = (buId: string) => {
    setActiveBU(buId);
    // Reset filters when switching BU
    setFilterRule("ALL");
    setFilterStatus("ALL");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setExpandedId(null);
  };

  const handleBackToOverview = () => {
    setActiveBU(null);
  };

  const handleExportAnomalies = () => {
    if (!filtered || filtered.length === 0) {
      alert(language === "id" ? "Tidak ada data untuk di-export." : "No data to export.");
      return;
    }

    const headers = ["ID", "Rule Code", "Rule Name", "Sector", "Entity Type", "Entity ID", "Entity Name", "Outlet", "Risk Score", "Status", "Date", "Description"];
    const rows = filtered.map(a => [
      a.id,
      a.ruleCode,
      `"${a.ruleName.replace(/"/g, '""')}"`,
      a.sector || "",
      a.entityType,
      a.entityId,
      `"${a.entityName.replace(/"/g, '""')}"`,
      `"${(a.outletName || a.branchName || "").replace(/"/g, '""')}"`,
      a.riskScore,
      a.status,
      a.detectedAt,
      `"${a.description.replace(/"/g, '""')}"`
    ]);

    let htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    htmlContent += `<head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Ringkasan Anomali</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>`;
    htmlContent += `<body><table border="1">`;
    htmlContent += `<tr>` + headers.map(h => `<th style="background-color: #f2f2f2;">${h}</th>`).join("") + `</tr>`;
    for (const r of rows) {
      htmlContent += `<tr>` + r.map(c => `<td>${c}</td>`).join("") + `</tr>`;
    }
    htmlContent += `</table></body></html>`;

    const file = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.download = `Anomalies_Summary_Export_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportRawData = async () => {
    if (!filtered || filtered.length === 0) {
      alert(language === "id" ? "Tidak ada data anomali untuk diexport." : "No anomaly data to export.");
      return;
    }

    const txIds = new Set<string>();
    for (const a of filtered) {
      if (a.metadata && Array.isArray(a.metadata.involvedTxIds)) {
        for (const id of a.metadata.involvedTxIds) {
          txIds.add(id);
        }
      }
    }

    if (txIds.size === 0) {
      alert(language === "id" ? "Data transaksi mentah tidak tersedia untuk anomali yang dipilih." : "Raw transaction data is not available for the selected anomalies.");
      return;
    }

    try {
      const response = await fetch("/api/risk-intelligence/export-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txIds: Array.from(txIds), buId: validBUId })
      });

      if (!response.ok) throw new Error("Failed to export raw data");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const element = document.createElement("a");
      element.href = url;
      element.download = `Anomalies_RAW_Transactions_${new Date().toISOString().slice(0,10)}.xls`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(language === "id" ? "Gagal mengexport data mentah." : "Failed to export raw data.");
    }
  };

  // ─── Loading / Error States ───────────────────────────────────────
  if (isLoading && !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
        <p className="text-sm text-slate-400">Loading live anomaly data...</p>
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

  // ═══════════════════════════════════════════════════════════════════
  // MODE 1: ALL BUSINESS UNITS — Executive Overview
  // ═══════════════════════════════════════════════════════════════════
  if (!isDetailMode) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader
          title={language === "id" ? "Anomaly Monitor — Ringkasan Eksekutif" : "Anomaly Monitor — Executive Summary"}
          subtitle={language === "id"
            ? "Tampilan konsolidasi seluruh Business Unit. Pilih Business Unit untuk melihat detail anomali."
            : "Consolidated view across all Business Units. Select a Business Unit to view anomaly details."
          }
        />

        {/* ─── 5 KPI Summary Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <AnomalyKPICard
            icon={BarChart3}
            label={language === "id" ? "Total Anomali" : "Total Anomalies"}
            value={overviewMetrics.total}
            color="#06b6d4"
            delay={0}
          />
          <AnomalyKPICard
            icon={AlertTriangle}
            label="Critical"
            value={overviewMetrics.critical}
            color="#ef4444"
            delay={0.05}
          />
          <AnomalyKPICard
            icon={ShieldAlert}
            label="High Risk"
            value={overviewMetrics.high}
            color="#f97316"
            delay={0.1}
          />
          <AnomalyKPICard
            icon={ShieldCheck}
            label="Medium Risk"
            value={overviewMetrics.medium}
            color="#eab308"
            delay={0.15}
          />
          <AnomalyKPICard
            icon={Zap}
            label="Low Risk"
            value={overviewMetrics.low}
            color="#22c55e"
            delay={0.2}
          />
        </div>

        {/* ─── AI Executive Summary ─────────────────────────────────── */}
        {aiExecutiveSummary && (
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
                  {aiExecutiveSummary.map((line, i) => (
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

        {/* ─── Business Unit Comparison Table ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm text-white">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  <span>{language === "id" ? "Ringkasan per Business Unit" : "Business Unit Summary"}</span>
                </CardTitle>
                <span className="text-xs text-slate-400">
                  {language === "id"
                    ? "Klik Business Unit untuk membuka detail anomali"
                    : "Click a Business Unit to open anomaly details"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Business Unit</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Total Anomaly</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span> Critical
                        </span>
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-orange-500"></span> High
                        </span>
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-yellow-500"></span> Medium
                        </span>
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span> Low
                        </span>
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Risk Score</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
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
                          transition={{ duration: 0.3, delay: 0.35 + idx * 0.04 }}
                          onClick={() => handleSelectBU(row.buId)}
                          className="border-b border-white/5 cursor-pointer transition-all duration-200 hover:bg-cyan-500/5 group"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{row.icon}</span>
                              <div>
                                <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition">{row.buName}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: row.color }}
                                  />
                                  {row.buCode} • {language === "id" ? sectorMeta[row.sector].labelId : sectorMeta[row.sector].label}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-mono font-bold text-white text-base">{row.total}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`font-mono font-bold text-sm ${row.critical > 0 ? "text-red-400" : "text-slate-600"}`}>
                              {row.critical}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`font-mono font-bold text-sm ${row.high > 0 ? "text-orange-400" : "text-slate-600"}`}>
                              {row.high}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`font-mono font-bold text-sm ${row.medium > 0 ? "text-yellow-400" : "text-slate-600"}`}>
                              {row.medium}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`font-mono font-bold text-sm ${row.low > 0 ? "text-green-400" : "text-slate-600"}`}>
                              {row.low}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span
                                className="font-mono font-bold text-sm"
                                style={{ color: riskLevelColors[riskLevel] }}
                              >
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
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectBU(row.buId);
                              }}
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
                    <ShieldCheck className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">
                      {language === "id" ? "Tidak ada anomali terdeteksi" : "No anomalies detected"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MODE 2: SPECIFIC BUSINESS UNIT — Detail Anomaly View
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 pb-10">
      {/* Back navigation + Header */}
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
          ? `${t("ri.anomalyTitle")} — ${activeBU.name}`
          : t("ri.anomalyTitle")
        }
        subtitle={activeBU
          ? (language === "id"
            ? `Detail anomali untuk ${activeBU.name} (${activeBU.code}) • Sektor ${sectorMeta[activeBU.sector].labelId}`
            : `Anomaly details for ${activeBU.name} (${activeBU.code}) • ${sectorMeta[activeBU.sector].label} Sector`)
          : t("ri.anomalySubtitle")
        }
        actions={[
          { label: language === "id" ? "Export (Ringkasan)" : "Export (Summary)", variant: "default", onClick: handleExportAnomalies },
          { label: language === "id" ? "Export (Raw Data)" : "Export (Raw Data)", variant: "outline", onClick: handleExportRawData },
        ]}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("ri.ruleDistribution")}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ruleDistribution}>
                <XAxis dataKey="code" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28}>
                  {ruleDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("ri.statusDistribution")}</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center gap-6">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} strokeWidth={0}>
                    {statusDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {statusDistribution.map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                  <span className="text-xs text-slate-300 flex-1">{s.name}</span>
                  <span className="text-xs font-mono text-slate-400">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>{t("ri.anomalyRegister")}</CardTitle>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
              />
              <span className="text-slate-500 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
              />
              <input
                type="text"
                placeholder={t("ri.search")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-48 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
              />
              <select value={filterRule} onChange={e => setFilterRule(e.target.value as any)} className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-slate-100 outline-none">
                <option value="ALL" className="bg-[#0b1739]">{t("ri.allRules")}</option>
                {ruleKeys.map(k => <option key={k} value={k} className="bg-[#0b1739]">{k}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-slate-100 outline-none">
                <option value="ALL" className="bg-[#0b1739]">{t("ri.allStatuses")}</option>
                {statusKeys.map(k => <option key={k} value={k} className="bg-[#0b1739]">{t(`ri.${k.toLowerCase()}` as any)}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin">
            <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 bg-[#0b1739] z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
                <tr className="text-left">
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[15%]">Rule</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[35%]">Entity</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[20%]">{t("ri.outlet")}</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[10%]">{t("ri.score")}</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[10%]">Status</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[10%] text-right">{t("ri.detected")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 30).map((a, idx) => (
                  <tr key={a.id} className="border-b border-white/5">
                    <td colSpan={6} className="p-0">
                      <table className="w-full table-fixed">
                        <tbody>
                          <tr
                            className={`hover:bg-white/[0.02] cursor-pointer transition ${expandedId === a.id ? "bg-white/[0.03]" : ""}`}
                            onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                          >
                            <td className="px-3 py-2.5 w-[15%]"><AnomalyRuleBadge code={a.ruleCode} /></td>
                            <td className="px-3 py-2.5 w-[35%]">
                              <div className="text-sm text-white font-medium">{a.entityName}</div>
                              <div className="text-[10px] text-slate-500">{a.entityType} • {a.entityId}</div>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-300 w-[20%]">{a.outletName}</td>
                            <td className="px-3 py-2.5 w-[10%]">
                              <span className="font-mono text-sm font-bold" style={{ color: a.riskScore >= 60 ? "#ef4444" : a.riskScore >= 35 ? "#f59e0b" : "#22c55e" }}>
                                {a.riskScore}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 w-[10%]">
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                                style={{ color: statusColors[a.status], backgroundColor: `${statusColors[a.status]}20` }}
                              >
                                {t(`ri.${a.status.toLowerCase()}` as any)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-400 font-mono w-[10%] text-right">{a.detectedAt}</td>
                          </tr>
                          {expandedId === a.id && (
                            <tr className="bg-slate-950/40 border-t border-white/5">
                              <td colSpan={6} className="px-6 py-4">
                                <motion.div 
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="space-y-3 text-left"
                                >
                                  <div>
                                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                      {language === "id" ? "Deskripsi Deteksi" : "Detection Description"}
                                    </div>
                                    <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">{a.description}</p>
                                  </div>
                                  
                                  {a.metadata && Object.keys(a.metadata).length > 0 && (
                                    <div>
                                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        {language === "id" ? "Parameter Pendukung / Metadata" : "Supporting Parameters / Metadata"}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(a.metadata).map(([key, val]) => (
                                          <div key={key} className="rounded bg-white/[0.03] border border-white/5 px-2.5 py-1 flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">{key}:</span>
                                            <span className="text-[10px] font-mono font-bold text-cyan-400">{String(val)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* AI Investigation Panel */}
                                  <div className="mt-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            setSelectedAnomalyForAI(a);
                                            setIsAIModalOpen(true);
                                          }}
                                          className="text-[11px] font-bold bg-cyan-500 text-slate-950 px-3 py-1 rounded-full hover:bg-cyan-400 transition flex items-center gap-1 shadow-md shadow-cyan-500/20"
                                        >
                                          <Sparkles className="h-3.5 w-3.5" />
                                          <span>{"🤖 AI Auto-Investigate"}</span>
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {aiLoading[a.id] && (
                                      <div className="rounded-lg bg-cyan-950/30 border border-cyan-900/50 p-4 flex items-center justify-center space-x-2">
                                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-cyan-300 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
                                        <span className="text-xs font-medium text-cyan-500 ml-2">
                                          {language === "id" ? "AI sedang membaca seluruh database historis..." : "AI is reading full historical database..."}
                                        </span>
                                      </div>
                                    )}

                                    {aiRecommendations[a.id] && !aiLoading[a.id] && (
                                      <div className="rounded-lg bg-gradient-to-br from-cyan-950/40 to-slate-900/40 border border-cyan-800/50 p-4 shadow-inner shadow-cyan-900/20">
                                        <div className="whitespace-pre-wrap text-xs text-slate-200 leading-relaxed font-sans">
                                          {aiRecommendations[a.id].split('\\n').map((line, i) => (
                                            <p key={i} className={line.startsWith('-') ? 'ml-4 my-1' : 'mb-2'}>
                                              {line.replace(/\\*\\*/g, '')}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-center text-xs text-slate-500">
            {filtered.length} {t("ri.anomalies").toLowerCase()} {filterRule !== "ALL" || filterStatus !== "ALL" ? "(filtered)" : ""}
          </div>
        </CardContent>
      </Card>

      {/* AI Investigation Modal */}
      <AIInvestigationModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        anomaly={selectedAnomalyForAI}
      />

      {/* Floating Interactive AI Risk Copilot */}
      <AIRiskCopilotDrawer />
    </div>
  );
}
