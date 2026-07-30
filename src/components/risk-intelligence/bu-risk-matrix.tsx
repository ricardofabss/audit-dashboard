"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, Users, ChevronRight, Shield, Zap, CheckCircle2 } from "lucide-react";
import { businessUnits, sectorMeta, type SectorType, type BusinessUnit } from "@/lib/business-units";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import type { RiskMockDataSet, RiskLevel } from "@/types/risk-intelligence";
import { useTranslation } from "@/hooks/use-translation";

type Props = {
  data: RiskMockDataSet;
  activeBUId: string | null;
  onSelectBU: (buId: string | null) => void;
  selectedSectorFilter?: SectorType | "ALL";
};

export type BUMetrics = {
  bu: BusinessUnit;
  activeAnomaliesCount: number;
  criticalAnomaliesCount: number;
  criticalCustomersCount: number;
  highRiskBranchesCount: number;
  totalBranchesCount: number;
  avgBranchScore: number;
  compositeRiskScore: number;
  riskLevel: RiskLevel;
};

export function BURiskMatrix({ data, activeBUId, onSelectBU, selectedSectorFilter = "ALL" }: Props) {
  const { language } = useTranslation();

  // Compute metrics per BU
  const buMetricsMap = useMemo(() => {
    const map = new Map<string, BUMetrics>();

    for (const bu of businessUnits) {
      const buAnomalies = data.anomalyDetections.filter((a) => a.businessUnitId === bu.id);
      const activeAnomalies = buAnomalies.filter(
        (a) => a.status === "DETECTED" || a.status === "CONFIRMED" || a.status === "INVESTIGATING"
      );
      const criticalAnomalies = buAnomalies.filter((a) => a.riskScore >= 80);

      const buBranches = data.branchRiskProfiles.filter((b) => b.businessUnitId === bu.id);
      const highRiskBranches = buBranches.filter(
        (b) => b.riskLevel === "CRITICAL" || b.riskLevel === "HIGH"
      );
      const avgBranchScore =
        buBranches.length > 0
          ? Math.round(buBranches.reduce((s, b) => s + b.totalScore, 0) / buBranches.length)
          : 0;

      const buCustomers = data.customerRiskProfiles.filter((c) => c.businessUnitId === bu.id);
      const criticalCustomers = buCustomers.filter((c) => c.riskLevel === "CRITICAL");

      // Composite Score: blend avg branch score + weighted active criticals
      const compositeRiskScore = Math.min(
        100,
        Math.max(
          10,
          Math.round(
            avgBranchScore * 0.7 +
              criticalAnomalies.length * 2.5 +
              criticalCustomers.length * 1.5
          )
        )
      );

      let riskLevel: RiskLevel = "LOW";
      if (compositeRiskScore >= 75) riskLevel = "CRITICAL";
      else if (compositeRiskScore >= 55) riskLevel = "HIGH";
      else if (compositeRiskScore >= 35) riskLevel = "MEDIUM";

      map.set(bu.id, {
        bu,
        activeAnomaliesCount: activeAnomalies.length,
        criticalAnomaliesCount: criticalAnomalies.length,
        criticalCustomersCount: criticalCustomers.length,
        highRiskBranchesCount: highRiskBranches.length,
        totalBranchesCount: buBranches.length,
        avgBranchScore,
        compositeRiskScore,
        riskLevel,
      });
    }

    return map;
  }, [data]);

  const sectorsToDisplay: SectorType[] = useMemo(() => {
    if (selectedSectorFilter === "ALL") {
      return ["PERGADAIAN", "MULTIFINANCE", "OTOMOTIF"];
    }
    return [selectedSectorFilter];
  }, [selectedSectorFilter]);

  return (
    <div className="space-y-6">
      {sectorsToDisplay.map((sector) => {
        const meta = sectorMeta[sector];
        const sectorBUs = businessUnits.filter((b) => b.sector === sector);

        return (
          <div key={sector} className="space-y-3">
            {/* Sector Header Banner */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{meta.icon}</span>
                <h3 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
                  <span>{language === "id" ? meta.labelId : meta.label}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono font-normal text-slate-300">
                    {sectorBUs.length} {language === "id" ? "Unit Bisnis" : "BUs"}
                  </span>
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {language === "id" ? "Aturan Anomali Sektor:" : "Sector Rules:"} {meta.ruleCodes.join(", ")}
              </span>
            </div>

            {/* Grid of BUs under this sector */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {sectorBUs.map((bu, index) => {
                const metrics = buMetricsMap.get(bu.id);
                if (!metrics) return null;

                const isSelected = activeBUId === bu.id;

                return (
                  <motion.div
                    key={bu.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-200 group ${
                      isSelected
                        ? "border-cyan-400 bg-gradient-to-br from-cyan-950/40 via-[#0b1739]/90 to-[#0d1e47]/90 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50"
                        : "border-white/10 bg-gradient-to-br from-[#0b1429]/80 via-[#0a1122]/90 to-[#0d172e]/80 hover:border-white/20 hover:bg-[#0f1d3d]/60"
                    }`}
                  >
                    {/* Top Accent Line matching BU Brand Color */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: bu.color }}
                    />

                    {/* Card Header: BU Code, Name & Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-wider"
                            style={{
                              backgroundColor: bu.color + "25",
                              color: bu.color,
                              border: `1px solid ${bu.color}40`,
                            }}
                          >
                            {bu.code}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {bu.brand}
                          </span>
                        </div>
                        <h4 className="mt-1 text-sm font-bold text-white group-hover:text-cyan-300 transition">
                          {bu.name}
                        </h4>
                      </div>
                      <RiskLevelIndicator level={metrics.riskLevel} size="sm" showLabel />
                    </div>

                    {/* Composite Risk Score Progress */}
                    <div className="space-y-1.5 mb-4 rounded-lg bg-white/[0.03] p-2.5 border border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-cyan-400" />
                          {language === "id" ? "Skor Risiko Komposit" : "Composite Risk Score"}
                        </span>
                        <span className="font-bold font-mono text-white text-sm">
                          {metrics.compositeRiskScore}
                          <span className="text-[10px] text-slate-400">/100</span>
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${metrics.compositeRiskScore}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            metrics.compositeRiskScore >= 75
                              ? "bg-gradient-to-r from-rose-500 to-amber-500"
                              : metrics.compositeRiskScore >= 55
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                              : "bg-gradient-to-r from-cyan-500 to-emerald-400"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <div className="flex items-center justify-center gap-1 text-rose-400 text-xs font-semibold">
                          <Zap className="h-3 w-3" />
                          <span>{metrics.activeAnomaliesCount}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {language === "id" ? "Anomali Aktif" : "Anomalies"}
                        </div>
                      </div>

                      <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-semibold">
                          <Users className="h-3 w-3" />
                          <span>{metrics.criticalCustomersCount}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {language === "id" ? "Nasabah Kritis" : "Critical CIF"}
                        </div>
                      </div>

                      <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <div className="flex items-center justify-center gap-1 text-cyan-400 text-xs font-semibold">
                          <Building2 className="h-3 w-3" />
                          <span>
                            {metrics.highRiskBranchesCount}/{metrics.totalBranchesCount}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {language === "id" ? "Cabang Risiko" : "High Risk Outlets"}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Filter Action Button */}
                    <button
                      onClick={() => onSelectBU(isSelected ? null : bu.id)}
                      className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-semibold transition ${
                        isSelected
                          ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
                          : "bg-white/[0.06] text-slate-200 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {language === "id" ? "Sedang Ditampilkan (Reset Konsolidasi)" : "Active (Reset to Consolidated)"}
                        </>
                      ) : (
                        <>
                          <span>{language === "id" ? `Analisis ${bu.shortName}` : `Inspect ${bu.shortName}`}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
