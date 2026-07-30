"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, Users, Zap, Shield, ChevronRight, CheckCircle2 } from "lucide-react";
import { businessUnits, sectorMeta, type SectorType, type BusinessUnit } from "@/lib/business-units";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import type { RiskMockDataSet, RiskLevel } from "@/types/risk-intelligence";
import { useTranslation } from "@/hooks/use-translation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  sector: SectorType;
  data: RiskMockDataSet;
  activeBUId: string | null;
  onSelectBU: (buId: string | null) => void;
};

export function SectorCompanyComparison({ sector, data, activeBUId, onSelectBU }: Props) {
  const { language } = useTranslation();
  const sectorBUs = useMemo(() => businessUnits.filter((b) => b.sector === sector), [sector]);

  // Compute metrics for each company (BU) within this sector
  const companyMetrics = useMemo(() => {
    return sectorBUs.map((bu) => {
      const buAnomalies = data.anomalyDetections.filter((a) => a.businessUnitId === bu.id);
      const activeAnomalies = buAnomalies.filter(
        (a) => a.status === "DETECTED" || a.status === "CONFIRMED" || a.status === "INVESTIGATING"
      );

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

      // Composite Risk Score
      const compositeScore = Math.min(
        100,
        Math.max(
          10,
          Math.round(
            avgBranchScore * 0.7 + activeAnomalies.length * 2.5 + criticalCustomers.length * 1.5
          )
        )
      );

      let riskLevel: RiskLevel = "LOW";
      if (compositeScore >= 75) riskLevel = "CRITICAL";
      else if (compositeScore >= 55) riskLevel = "HIGH";
      else if (compositeScore >= 35) riskLevel = "MEDIUM";

      return {
        bu,
        activeAnomalies: activeAnomalies.length,
        criticalCustomers: criticalCustomers.length,
        highRiskBranches: highRiskBranches.length,
        totalBranches: buBranches.length,
        avgBranchScore,
        compositeScore,
        riskLevel,
      };
    });
  }, [sectorBUs, data]);

  return (
    <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm text-white">
            <Building2 className="h-4 w-4 text-cyan-400" />
            <span>
              {language === "id"
                ? `Perbandingan Perusahaan di Sektor ${sectorMeta[sector].labelId} (${sectorBUs.length} Perusahaan)`
                : `Company Comparison within ${sectorMeta[sector].label} (${sectorBUs.length} Companies)`}
            </span>
          </CardTitle>
          {activeBUId && (
            <button
              onClick={() => onSelectBU(null)}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono font-medium"
            >
              <span>{language === "id" ? "Reset Perbandingan (Lihat Semua)" : "Reset to All"}</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          {language === "id"
            ? "Perbandingan lanskap risiko antar-perusahaan di bawah sektor ini side-by-side"
            : "Side-by-side risk landscape comparison across companies in this sector"}
        </p>
      </CardHeader>

      <CardContent>
        <div
          className={`grid grid-cols-1 gap-4 ${
            sectorBUs.length === 2
              ? "sm:grid-cols-2"
              : sectorBUs.length === 1
              ? "grid-cols-1"
              : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
          {companyMetrics.map(({ bu, activeAnomalies, criticalCustomers, highRiskBranches, totalBranches, compositeScore, riskLevel }) => {
            const isSelected = activeBUId === bu.id;

            return (
              <motion.div
                key={bu.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-200 group ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                {/* Brand Color Top Line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: bu.color }}
                />

                {/* Company Header */}
                <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono"
                        style={{
                          backgroundColor: bu.color + "25",
                          color: bu.color,
                          border: `1px solid ${bu.color}40`,
                        }}
                      >
                        {bu.code}
                      </span>
                      <span className="text-[11px] text-slate-400">{bu.brand}</span>
                    </div>
                    <h4 className="mt-1 text-sm font-bold text-white group-hover:text-cyan-300 transition">
                      {bu.name}
                    </h4>
                  </div>
                  <RiskLevelIndicator level={riskLevel} size="sm" />
                </div>

                {/* Composite Risk Score Bar */}
                <div className="space-y-1 mb-3 rounded-lg bg-white/[0.03] p-2 border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {language === "id" ? "Skor Risiko:" : "Risk Score:"}
                    </span>
                    <span className="font-bold font-mono text-cyan-300">
                      {compositeScore}/100
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        compositeScore >= 75
                          ? "bg-rose-500"
                          : compositeScore >= 55
                          ? "bg-amber-400"
                          : "bg-cyan-400"
                      }`}
                      style={{ width: `${compositeScore}%` }}
                    />
                  </div>
                </div>

                {/* Key Numbers Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-center mb-3">
                  <div className="rounded bg-white/[0.02] p-1.5 border border-white/5">
                    <div className="text-xs font-bold text-rose-400 font-mono">
                      {activeAnomalies}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {language === "id" ? "Anomali" : "Anomalies"}
                    </div>
                  </div>

                  <div className="rounded bg-white/[0.02] p-1.5 border border-white/5">
                    <div className="text-xs font-bold text-amber-400 font-mono">
                      {criticalCustomers}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {language === "id" ? "CIF Kritis" : "Critical CIF"}
                    </div>
                  </div>

                  <div className="rounded bg-white/[0.02] p-1.5 border border-white/5">
                    <div className="text-xs font-bold text-cyan-400 font-mono">
                      {highRiskBranches}/{totalBranches}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {language === "id" ? "Cabang Risk" : "Risk Outlets"}
                    </div>
                  </div>
                </div>

                {/* Action Filter Button */}
                <button
                  onClick={() => onSelectBU(isSelected ? null : bu.id)}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-[11px] font-semibold transition ${
                    isSelected
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "bg-white/[0.06] text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10"
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{language === "id" ? "Terpilih (Reset Semua)" : "Active (Reset)"}</span>
                    </>
                  ) : (
                    <>
                      <span>{language === "id" ? `Filter ${bu.shortName}` : `Inspect ${bu.shortName}`}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
