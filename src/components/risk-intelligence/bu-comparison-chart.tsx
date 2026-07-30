"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts";
import { businessUnits, sectorMeta, type SectorType } from "@/lib/business-units";
import type { RiskMockDataSet } from "@/types/risk-intelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Filter } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

type Props = {
  data: RiskMockDataSet;
  onSelectBU?: (buId: string | null) => void;
  activeBUId?: string | null;
};

export function BUComparisonChart({ data, onSelectBU, activeBUId }: Props) {
  const { language } = useTranslation();
  const [metricType, setMetricType] = useState<"score" | "anomalies">("score");

  const chartData = useMemo(() => {
    return businessUnits.map((bu) => {
      const buAnomalies = data.anomalyDetections.filter(
        (a) => a.businessUnitId === bu.id && (a.status === "DETECTED" || a.status === "CONFIRMED" || a.status === "INVESTIGATING")
      );

      const buBranches = data.branchRiskProfiles.filter((b) => b.businessUnitId === bu.id);
      const avgBranchScore =
        buBranches.length > 0
          ? Math.round(buBranches.reduce((s, b) => s + b.totalScore, 0) / buBranches.length)
          : 0;

      const buCustomers = data.customerRiskProfiles.filter(
        (c) => c.businessUnitId === bu.id && c.riskLevel === "CRITICAL"
      );

      const compositeScore = Math.min(
        100,
        Math.max(
          10,
          Math.round(avgBranchScore * 0.7 + buAnomalies.length * 2.5 + buCustomers.length * 1.5)
        )
      );

      return {
        buId: bu.id,
        code: bu.code,
        shortName: bu.shortName,
        fullName: bu.name,
        sector: bu.sector,
        brand: bu.brand,
        color: bu.color,
        score: compositeScore,
        activeAnomalies: buAnomalies.length,
        criticalCustomers: buCustomers.length,
        branchCount: buBranches.length,
      };
    });
  }, [data]);

  const sortedData = useMemo(() => {
    return [...chartData].sort((a, b) => {
      if (metricType === "score") return b.score - a.score;
      return b.activeAnomalies - a.activeAnomalies;
    });
  }, [chartData, metricType]);

  return (
    <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm text-white">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              {language === "id"
                ? "Perbandingan Risk Exposure Antar 10 Unit Bisnis"
                : "Cross-BU Risk Exposure Comparison"}
            </CardTitle>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === "id"
                ? "Perbandingan lanskap risiko dan tingkat anomali seluruh unit bisnis side-by-side"
                : "Side-by-side comparison of risk scores & anomaly levels across all business units"}
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1 self-start sm:self-auto">
            <button
              onClick={() => setMetricType("score")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                metricType === "score"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {language === "id" ? "Skor Risiko" : "Risk Score"}
            </button>
            <button
              onClick={() => setMetricType("anomalies")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                metricType === "anomalies"
                  ? "bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {language === "id" ? "Anomali Aktif" : "Active Anomalies"}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={metricType === "score" ? [0, 100] : [0, "auto"]}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-white/15 bg-[#091228]/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span>{sectorMeta[item.sector as SectorType].icon}</span>
                            <span>{item.fullName}</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>{language === "id" ? "Skor Risiko:" : "Risk Score:"}</span>
                          <span className="font-bold font-mono text-cyan-300">
                            {item.score}/100
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>{language === "id" ? "Anomali Aktif:" : "Active Anomalies:"}</span>
                          <span className="font-bold font-mono text-rose-400">
                            {item.activeAnomalies}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>{language === "id" ? "Nasabah Kritis:" : "Critical CIF:"}</span>
                          <span className="font-bold font-mono text-amber-400">
                            {item.criticalCustomers}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey={metricType === "score" ? "score" : "activeAnomalies"}
                radius={[6, 6, 0, 0]}
                onClick={(entry) => onSelectBU?.(activeBUId === entry.buId ? null : entry.buId)}
                className="cursor-pointer"
              >
                {sortedData.map((entry) => (
                  <Cell
                    key={entry.buId}
                    fill={entry.color}
                    opacity={activeBUId === null || activeBUId === entry.buId ? 0.9 : 0.3}
                    stroke={activeBUId === entry.buId ? "#ffffff" : undefined}
                    strokeWidth={activeBUId === entry.buId ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-white/5">
          {businessUnits.map((bu) => (
            <button
              key={bu.id}
              onClick={() => onSelectBU?.(activeBUId === bu.id ? null : bu.id)}
              className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono transition ${
                activeBUId === bu.id
                  ? "bg-white/20 text-white font-bold ring-1 ring-white/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: bu.color }}
              />
              <span>{bu.shortName}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
