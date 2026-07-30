"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { useBusinessUnitStore, useActiveBU } from "@/hooks/use-business-unit";

type Props = {
  onViewAction?: () => void;
};

export function AIEarlyWarningBanner({ onViewAction }: Props) {
  const { language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeBU = useActiveBU();
  const validBUId = activeBU ? activeBU.id : null;

  const [warningData, setWarningData] = useState<{
    sectorName: string;
    predictedEscalationPercent: number;
    highRiskFocusBranch: string;
    recommendedAction: string;
  } | null>(null);

  useEffect(() => {
    const url = `/api/risk-intelligence` + (validBUId ? `?buId=${validBUId}&_t=${Date.now()}` : `?_t=${Date.now()}`);

    fetch(url, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const branches = data.branchRiskProfiles || [];
        const detections = data.anomalyDetections || [];
        const trends = data.riskTrends || [];

        if (branches.length === 0 && detections.length === 0) {
          setWarningData(null);
          return;
        }

        // Find highest risk branch
        const sortedBranches = [...branches].sort((a: any, b: any) => b.totalScore - a.totalScore);
        const topBranch = sortedBranches[0];

        // Calculate escalation from trends
        let escalationPercent = 0;
        if (trends.length >= 2) {
          const latest = trends[trends.length - 1];
          const previous = trends[trends.length - 2];
          if (previous.anomalyCount > 0) {
            escalationPercent = Math.round(
              ((latest.anomalyCount - previous.anomalyCount) / previous.anomalyCount) * 100
            );
          }
        }

        // Determine sector name
        const sectorName = activeBU
          ? activeBU.name
          : "Holding Consolidated";

        // Build recommended action based on real data
        const criticalCount = detections.filter((d: any) => d.riskScore >= 80).length;
        const action = criticalCount > 5
          ? `Terdeteksi ${criticalCount} anomali kritis. Jadwalkan audit spesifik pada ${topBranch?.branchName || "cabang berisiko tertinggi"} sebelum akhir bulan.`
          : `Terdeteksi ${detections.length} anomali aktif. Monitor rutin cabang ${topBranch?.branchName || "utama"} dan lakukan desk audit preventif.`;

        setWarningData({
          sectorName,
          predictedEscalationPercent: Math.abs(escalationPercent),
          highRiskFocusBranch: topBranch
            ? `${topBranch.outletName} (${topBranch.branchName})`
            : "Tidak teridentifikasi",
          recommendedAction: action,
        });
      })
      .catch((err) => {
        console.error("Failed to load early warning data:", err);
        setWarningData(null);
      });
  }, [validBUId, activeBU]);

  if (!warningData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-[#0d1730]/90 to-amber-950/30 p-4 shadow-xl backdrop-blur-xl"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-400" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
            <Brain className="h-5 w-5 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold font-mono uppercase text-rose-300 border border-rose-500/30">
                🤖 AI Predictive Early Warning
              </span>
              {warningData.predictedEscalationPercent > 0 && (
                <span className="text-xs font-mono font-semibold text-amber-300">
                  +{warningData.predictedEscalationPercent}% Perubahan Anomali (vs Periode Sebelumnya)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              <span className="text-white font-bold">Fokus Area:</span> {warningData.highRiskFocusBranch} —{" "}
              {warningData.recommendedAction}
            </p>
          </div>
        </div>

        {onViewAction && (
          <Button
            onClick={onViewAction}
            size="sm"
            className="shrink-0 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs gap-1.5 shadow-lg shadow-rose-500/20 self-start md:self-auto"
          >
            <span>{language === "id" ? "Ambil Tindakan Preventif" : "Take Action"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
