"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronRight,
  Filter,
  Globe,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  Brain,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU, useActiveSector } from "@/hooks/use-business-unit";
import { businessUnits, sectorMeta, type SectorType } from "@/lib/business-units";
import { RiskKPICard } from "@/components/risk-intelligence/risk-kpi-card";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { getAnomalyRuleColor } from "@/components/risk-intelligence/anomaly-rule-badge";
import { SectorCompanyComparison } from "@/components/risk-intelligence/sector-company-comparison";
import { AIEarlyWarningBanner } from "@/components/risk-intelligence/ai-early-warning-banner";
import { AIRiskCopilotDrawer } from "@/components/risk-intelligence/ai-risk-copilot-drawer";
import type { AnomalyRuleCode, RiskLevel, RiskMockDataSet } from "@/types/risk-intelligence";
import Link from "next/link";

// ─── Shared Tooltip Style ──────────────────────────────────────────
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
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

export default function RiskIntelligenceDashboard() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const setActiveBU = useBusinessUnitStore((s) => s.setActiveBU);
  const activeBU = useActiveBU();
  const activeSector = useActiveSector();

  // Selected Sector Tab: "HOLDING" | "PERGADAIAN" | "MULTIFINANCE" | "OTOMOTIF"
  const [selectedTab, setSelectedTab] = useState<"HOLDING" | SectorType>("HOLDING");

  const validBUId = activeBU ? activeBU.id : null;

  const [data, setData] = useState<RiskMockDataSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [activePeriod, setActivePeriod] = useState<string>("30d");
  const [activeSeverities, setActiveSeverities] = useState<Set<RiskLevel>>(
    new Set(SEVERITY_LEVELS)
  );

  // Sync tab with active BU sector if changed via header dropdown
  useEffect(() => {
    if (activeSector) {
      setSelectedTab(activeSector);
    }
  }, [activeSector]);

  // Data Fetching
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
        if (isMounted) {
          setData(fetchedData);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) {
          setError(err.message || "Failed to load");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [validBUId]);

  // Handle Switching Sector Tabs
  const handleTabSwitch = (tab: "HOLDING" | SectorType) => {
    setSelectedTab(tab);
    if (tab === "HOLDING") {
      setActiveBU(null);
    } else {
      // If active BU doesn't belong to selected tab, reset BU filter to show sector consolidated
      if (!activeBU || activeBU.sector !== tab) {
        setActiveBU(null);
      }
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    if (!data)
      return {
        activeAnomalies: 0,
        criticalCustomers: 0,
        avgBranchScore: 0,
        monitoredBranches: 0,
        highRiskBranches: 0,
        resolvedRate: 0,
      };

    // Filter detections by current tab if not HOLDING
    const tabDetections =
      selectedTab === "HOLDING"
        ? data.anomalyDetections
        : data.anomalyDetections.filter((a) => a.sector === selectedTab);

    const activeAnomalies = tabDetections.filter(
      (a) => a.status === "DETECTED" || a.status === "CONFIRMED" || a.status === "INVESTIGATING"
    );

    const tabCustomers =
      selectedTab === "HOLDING"
        ? data.customerRiskProfiles
        : data.customerRiskProfiles.filter((c) => c.sector === selectedTab);

    const criticalCustomers = tabCustomers.filter((c) => c.riskLevel === "CRITICAL");

    const tabBranches =
      selectedTab === "HOLDING"
        ? data.branchRiskProfiles
        : data.branchRiskProfiles.filter((b) => b.sector === selectedTab);

    const highRiskBranches = tabBranches.filter(
      (b) => b.riskLevel === "CRITICAL" || b.riskLevel === "HIGH"
    );

    const resolved = tabDetections.filter((a) => a.status === "RESOLVED").length;
    const total = tabDetections.length;
    const avgBranchScore =
      tabBranches.length > 0
        ? Math.round(tabBranches.reduce((s, b) => s + b.totalScore, 0) / tabBranches.length)
        : 0;

    return {
      activeAnomalies: activeAnomalies.length,
      criticalCustomers: criticalCustomers.length,
      avgBranchScore,
      monitoredBranches: tabBranches.length,
      highRiskBranches: highRiskBranches.length,
      resolvedRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  }, [data, selectedTab]);

  // Sector Overview Cards for Holding View
  const sectorOverviewCards = useMemo(() => {
    if (!data) return [];

    return (["PERGADAIAN", "MULTIFINANCE", "OTOMOTIF"] as SectorType[]).map((sec) => {
      const meta = sectorMeta[sec];
      const sectorBUs = businessUnits.filter((b) => b.sector === sec);
      const sectorDetections = data.anomalyDetections.filter((a) => a.sector === sec);
      const activeCount = sectorDetections.filter(
        (a) => a.status === "DETECTED" || a.status === "CONFIRMED" || a.status === "INVESTIGATING"
      ).length;
      const criticalCIFs = data.customerRiskProfiles.filter(
        (c) => c.sector === sec && c.riskLevel === "CRITICAL"
      ).length;

      const avgScore =
        data.branchRiskProfiles
          .filter((b) => b.sector === sec)
          .reduce((s, b) => s + b.totalScore, 0) /
        Math.max(1, data.branchRiskProfiles.filter((b) => b.sector === sec).length);

      let level: RiskLevel = "LOW";
      if (avgScore >= 65 || activeCount >= 20) level = "CRITICAL";
      else if (avgScore >= 50 || activeCount >= 10) level = "HIGH";
      else if (avgScore >= 35) level = "MEDIUM";

      return {
        sector: sec,
        meta,
        sectorBUs,
        activeCount,
        criticalCIFs,
        avgScore: Math.round(avgScore),
        level,
      };
    });
  }, [data]);

  // Anomaly Rules Distribution
  const ruleDistribution = useMemo(() => {
    if (!data) return [];
    const counts = new Map<AnomalyRuleCode, number>();
    for (const a of data.anomalyDetections) {
      if (selectedTab !== "HOLDING" && a.sector !== selectedTab) continue;
      counts.set(a.ruleCode, (counts.get(a.ruleCode) || 0) + 1);
    }

    return data.anomalyRules
      .filter((r) => selectedTab === "HOLDING" || r.sector === selectedTab)
      .map((r) => ({
        code: r.code,
        name: language === "id" ? r.nameId : r.name,
        count: counts.get(r.code) || 0,
        fill: getAnomalyRuleColor(r.code),
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, selectedTab, language]);

  // Pawn Bell Curve (only when in PERGADAIAN sector or PERGADAIAN selected)
  const bellCurveData = useMemo(() => {
    if (!data || !data.branchRiskProfiles || data.branchRiskProfiles.length === 0) {
      return { curvePoints: [], branchPoints: [], stats: { mean: 0, stdDev: 0 } };
    }

    const pgBranches = data.branchRiskProfiles.filter(
      (b) => b.sector === "PERGADAIAN" && b.avgPawnDuration !== undefined && b.avgPawnDuration > 0
    );

    if (pgBranches.length === 0) {
      return { curvePoints: [], branchPoints: [], stats: { mean: 0, stdDev: 0 } };
    }

    const values = pgBranches.map((b) => b.avgPawnDuration!);
    const N = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / N;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / N;
    const stdDev = Math.max(1, Math.sqrt(variance));

    const curvePoints: { x: number; y: number }[] = [];
    const minX = mean - 3.5 * stdDev;
    const maxX = mean + 3.5 * stdDev;
    const step = (maxX - minX) / 79;
    const pdf = (x: number) =>
      (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));

    for (let i = 0; i < 80; i++) {
      const x = minX + i * step;
      curvePoints.push({ x: Number(x.toFixed(2)), y: pdf(x) });
    }

    const branchPoints = pgBranches.map((b) => {
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
      stats: { mean: Number(mean.toFixed(1)), stdDev: Number(stdDev.toFixed(1)) },
    };
  }, [data]);

  // Context Subtitle
  const pageSubtitle = useMemo(() => {
    if (selectedTab === "HOLDING") {
      return language === "id"
        ? "Tampilan Konsolidasi Holding — 3 Sektor Bisnis Utama (Pergadaian, Multifinance, Otomotif)"
        : "Holding Consolidated View — 3 Core Business Sectors (Pawnshop, Multifinance, Automotive)";
    }
    const meta = sectorMeta[selectedTab];
    const subBUs = businessUnits.filter((b) => b.sector === selectedTab);
    const activeBUText = activeBU ? ` • ${activeBU.name}` : "";
    return `${language === "id" ? meta.labelId : meta.label} (${subBUs.length} Unit Bisnis)${activeBUText}`;
  }, [selectedTab, activeBU, language]);

  const handleRunScan = () => {
    alert(
      "AI Anomaly Scan Engine:\n\n- Data sources scanned: Transactions, CIF Registers, General Ledgers.\n- Result: 0 new anomalies detected. Active risk thresholds remain within normal parameters."
    );
  };

  const handleExportRisk = () => {
    const element = document.createElement("a");
    const label = selectedTab === "HOLDING" ? "Holding_Consolidated" : selectedTab;
    const content = `AuditSphere AI - Risk Intelligence Summary Report\n================================================\nScope: ${label}\nGenerated: ${new Date().toLocaleString()}`;
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Risk_Intelligence_Report_${label}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
        <p className="text-sm text-slate-400">
          {language === "id" ? "Memuat risk dashboard..." : "Loading risk dashboard..."}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="text-rose-500 text-3xl font-bold">Error</div>
        <p className="text-sm text-slate-400">{error || "Data not available"}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <PageHeader
        title={
          selectedTab === "HOLDING"
            ? t("ri.dashTitle")
            : `${language === "id" ? "Dashboard Risk" : "Risk Dashboard"} ${
                sectorMeta[selectedTab].labelId
              }`
        }
        subtitle={pageSubtitle}
        actions={[
          { label: t("ri.btnRunScan"), variant: "default", onClick: handleRunScan },
          { label: t("ri.btnExportRisk"), onClick: handleExportRisk },
        ]}
      />

      {/* ─── AI PREDICTIVE EARLY WARNING BANNER ────────────────────────── */}
      <AIEarlyWarningBanner
        sectorName={selectedTab === "HOLDING" ? "Holding Consolidated" : sectorMeta[selectedTab].labelId}
        predictedEscalationPercent={selectedTab === "PERGADAIAN" ? 28 : selectedTab === "OTOMOTIF" ? 34 : 24}
        highRiskFocusBranch={
          selectedTab === "PERGADAIAN"
            ? "Outlet Menteng & Outlet Kemang"
            : selectedTab === "OTOMOTIF"
            ? "Showroom Kelapa Gading (GMA - Toyota)"
            : "Cabang Jakarta Selatan (SMF)"
        }
        recommendedAction={
          selectedTab === "PERGADAIAN"
            ? "Jadwalkan pisah-batas (cut-off) saldo tebus & klarifikasi 5 CIF berisiko kritis sebelum akhir bulan."
            : selectedTab === "OTOMOTIF"
            ? "Lakukan audit fisik stok mobil & verifikasi identitas pembeli STNK Mismatch (Rule O05)."
            : "Lakukan konfirmasi langsung ke 10 debitur angsuran tertunggak beruntun."
        }
      />

      {/* ─── 4-TAB SECTOR NAVIGATION BAR ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1739]/90 p-2 shadow-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {/* Holding Tab */}
          <button
            onClick={() => handleTabSwitch("HOLDING")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
              selectedTab === "HOLDING"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/30"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>{language === "id" ? "Konsolidasi Holding" : "Holding Overview"}</span>
          </button>

          {/* Pergadaian Tab */}
          <button
            onClick={() => handleTabSwitch("PERGADAIAN")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
              selectedTab === "PERGADAIAN"
                ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className="text-base">🏦</span>
            <span>{language === "id" ? "Sektor Pergadaian" : "Pawnshop Sector"}</span>
          </button>

          {/* Multifinance Tab */}
          <button
            onClick={() => handleTabSwitch("MULTIFINANCE")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
              selectedTab === "MULTIFINANCE"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/30"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className="text-base">💰</span>
            <span>{language === "id" ? "Sektor Multifinance" : "Multifinance Sector"}</span>
          </button>

          {/* Otomotif Tab */}
          <button
            onClick={() => handleTabSwitch("OTOMOTIF")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
              selectedTab === "OTOMOTIF"
                ? "bg-rose-500/20 text-rose-300 border border-rose-400/40 shadow-lg shadow-rose-500/10 ring-1 ring-rose-400/30"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className="text-base">🚗</span>
            <span>{language === "id" ? "Sektor Otomotif" : "Automotive Sector"}</span>
          </button>
        </div>

        {/* Child BU Filter Dropdown when inside a specific Sector */}
        {selectedTab !== "HOLDING" && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-slate-400 font-medium">
              {language === "id" ? "Unit Bisnis:" : "Sub BU:"}
            </span>
            <select
              value={activeBUId || "ALL"}
              onChange={(e) => setActiveBU(e.target.value === "ALL" ? null : e.target.value)}
              className="rounded-lg border border-white/15 bg-[#091224] px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">
                {language === "id"
                  ? `Semua BU ${sectorMeta[selectedTab].labelId}`
                  : `All ${sectorMeta[selectedTab].label} BUs`}
              </option>
              {businessUnits
                .filter((b) => b.sector === selectedTab)
                .map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.code} — {bu.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── 4 KPI SUMMARY CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RiskKPICard
          label={t("ri.totalAnomalies")}
          value={metrics.activeAnomalies}
          change="+12% vs last month"
          changeValue={12}
          icon={Zap}
          color="rose"
        />
        <RiskKPICard
          label={
            selectedTab === "PERGADAIAN"
              ? "Nasabah Gadai Kritis"
              : selectedTab === "MULTIFINANCE"
              ? "Debitur Kritis"
              : selectedTab === "OTOMOTIF"
              ? "Pembeli Kritis"
              : t("ri.criticalCustomers")
          }
          value={metrics.criticalCustomers}
          change="+3 minggu ini"
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
        />
        <RiskKPICard
          label="Tingkat Resolusi Anomali"
          value={`${metrics.resolvedRate}%`}
          change="Target: 85%"
          changeValue={0}
          icon={Shield}
          color="emerald"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODE 1: HOLDING CONSOLIDATED OVERVIEW (SIMPLE 3 SECTOR CARDS)
      ═══════════════════════════════════════════════════════════════════ */}
      {selectedTab === "HOLDING" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>
                {language === "id"
                  ? "Ringkasan 3 Sektor Bisnis Utama"
                  : "Core 3 Business Sectors Overview"}
              </span>
            </h3>
            <span className="text-xs text-slate-400">
              {language === "id"
                ? "Klik kartu sektor untuk membuka Dashboard Sektor Spesifik"
                : "Click any sector card to open dedicated sector dashboard"}
            </span>
          </div>

          {/* 3 Large Clean Sector Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {sectorOverviewCards.map((card) => (
              <motion.div
                key={card.sector}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1429]/90 via-[#0a1122]/95 to-[#0d172e]/90 p-5 shadow-xl transition-all duration-300 hover:border-cyan-400/50 hover:shadow-cyan-500/10"
              >
                {/* Accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: card.meta.color }}
                />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-xl bg-white/5 border border-white/10">
                      {card.meta.icon}
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                        {language === "id" ? card.meta.labelId : card.meta.label}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {card.sectorBUs.length}{" "}
                        {language === "id" ? "Unit Bisnis (BU)" : "Business Units"}
                      </p>
                    </div>
                  </div>
                  <RiskLevelIndicator level={card.level} size="sm" showLabel />
                </div>

                {/* Key Numbers */}
                <div className="grid grid-cols-2 gap-3 mb-4 rounded-xl bg-white/[0.03] p-3 border border-white/5">
                  <div>
                    <div className="text-xl font-bold font-mono text-white">
                      {card.activeCount}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {language === "id" ? "Anomali Aktif" : "Active Anomalies"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-cyan-300">
                      {card.avgScore}/100
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {language === "id" ? "Skor Risiko Cabang" : "Branch Risk Score"}
                    </div>
                  </div>
                </div>

                {/* Sub BU List Badges */}
                <div className="flex flex-wrap gap-1 mb-5">
                  {card.sectorBUs.map((bu) => (
                    <span
                      key={bu.id}
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium"
                      style={{
                        backgroundColor: bu.color + "20",
                        color: bu.color,
                        border: `1px solid ${bu.color}30`,
                      }}
                    >
                      {bu.shortName}
                    </span>
                  ))}
                </div>

                {/* Direct Dashboard Switcher Button */}
                <button
                  onClick={() => handleTabSwitch(card.sector)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all duration-200"
                  style={{
                    backgroundColor: card.meta.color + "20",
                    color: "#ffffff",
                    border: `1px solid ${card.meta.color}40`,
                  }}
                >
                  <span>
                    {language === "id"
                      ? `Buka Dashboard ${card.meta.labelId} →`
                      : `Open ${card.meta.label} Dashboard →`}
                  </span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Holding Risk Score Trend Chart */}
          <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-white">
                <Activity className="h-4 w-4 text-cyan-400" />
                {language === "id"
                  ? "Tren Risiko Konsolidasi Holding (12 Bulan)"
                  : "Holding Consolidated Risk Trend (12 Months)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.riskTrends}
                  margin={{ top: 8, right: 8, bottom: 4, left: -16 }}
                >
                  <defs>
                    <linearGradient id="gradCustomer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradBranch" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="customerAvg"
                    stroke="#22d3ee"
                    fill="url(#gradCustomer)"
                    strokeWidth={2}
                    name="Skor Risiko Nasabah"
                  />
                  <Area
                    type="monotone"
                    dataKey="branchAvg"
                    stroke="#fbbf24"
                    fill="url(#gradBranch)"
                    strokeWidth={2}
                    name="Skor Risiko Cabang"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODE 2: DEDICATED SECTOR DASHBOARDS (PERGADAIAN / MULTIFINANCE / OTOMOTIF)
      ═══════════════════════════════════════════════════════════════════ */}
      {selectedTab !== "HOLDING" && (
        <div className="space-y-6">
          {/* Sector Overview Banner */}
          <div
            className="relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl"
            style={{
              borderColor: sectorMeta[selectedTab].color + "40",
              background: `linear-gradient(135deg, ${sectorMeta[selectedTab].color}15 0%, #0b1429 100%)`,
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{sectorMeta[selectedTab].icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {language === "id"
                      ? `Dashboard Risiko Sektor ${sectorMeta[selectedTab].labelId}`
                      : `${sectorMeta[selectedTab].label} Risk Dashboard`}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {language === "id"
                      ? `Menampilkan analisis anomali & eksposur risiko khusus sektor ${sectorMeta[selectedTab].labelId}`
                      : `Dedicated anomaly analysis and risk exposure tailored for ${sectorMeta[selectedTab].label}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Aturan Anomali:</span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-mono font-bold text-white">
                  {sectorMeta[selectedTab].ruleCodes.join(", ")}
                </span>
              </div>
            </div>
          </div>

          {/* Within-Sector Company Comparison Matrix */}
          <SectorCompanyComparison
            sector={selectedTab}
            data={data}
            activeBUId={activeBUId}
            onSelectBU={(buId) => setActiveBU(buId)}
          />

          {/* Sector Anomaly Rules & Trend Row */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Rule Distribution */}
            <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-white">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  {language === "id"
                    ? `Distribusi Anomali Rules ${sectorMeta[selectedTab].labelId}`
                    : `${sectorMeta[selectedTab].label} Anomaly Rules Breakdown`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[350px] overflow-y-auto scrollbar-thin pr-2">
                  {ruleDistribution.map((rule) => {
                    const maxCount = Math.max(...ruleDistribution.map((r) => r.count), 1);
                    const pct = (rule.count / maxCount) * 100;
                    return (
                      <div key={rule.code} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: rule.fill + "20",
                                color: rule.fill,
                              }}
                            >
                              {rule.code}
                            </span>
                            <span className="text-xs text-slate-300 truncate">
                              {rule.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold font-mono text-white shrink-0 ml-2">
                            {rule.count}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: rule.fill }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Specialized Sector Widget: Bell Curve for PERGADAIAN or Trend for others */}
            {selectedTab === "PERGADAIAN" ? (
              <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-white">
                    <Brain className="h-4 w-4 text-cyan-400" />
                    Analisis Variansi Aging Gadai (Bell Curve)
                  </CardTitle>
                  <p className="text-[11px] text-slate-400">
                    Mean Aging: {bellCurveData.stats.mean} hari • StdDev:{" "}
                    {bellCurveData.stats.stdDev} hari
                  </p>
                </CardHeader>
                <CardContent className="h-72 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bellCurveData.curvePoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="x" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis hide />
                      <Tooltip {...tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="y"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-white">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    Tren Anomali Sektor {sectorMeta[selectedTab].labelId}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.riskTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip {...tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="branchAvg"
                        stroke={sectorMeta[selectedTab].color}
                        fill={sectorMeta[selectedTab].color}
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top Outlets / Branches for Selected Sector */}
          <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm text-white">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  <span>
                    Daftar {sectorMeta[selectedTab].entityLabels.branch.id} Berisiko Kritis
                  </span>
                </span>
                <Link
                  href="/risk-intelligence/branches"
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-normal"
                >
                  <span>Lihat Semua Cabang</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.branchRiskProfiles
                  .filter((b) => b.sector === selectedTab)
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .slice(0, 6)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">{b.outletName}</div>
                          <div className="text-[10px] text-slate-400">
                            {b.branchName} • {b.regionName}
                          </div>
                        </div>
                        <RiskLevelIndicator level={b.riskLevel} size="sm" />
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                        <span className="text-slate-400">Skor Risiko:</span>
                        <span className="font-bold font-mono text-cyan-300">
                          {b.totalScore}/100
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Anomali Aktif:</span>
                        <span className="font-bold font-mono text-rose-400">
                          {b.activeAnomalies}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating AI Risk Copilot Chat Assistant */}
      <AIRiskCopilotDrawer />
    </div>
  );
}
