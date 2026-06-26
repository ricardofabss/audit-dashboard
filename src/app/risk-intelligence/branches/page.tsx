"use client";

import { useMemo, useState } from "react";
import { Building2, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { getRiskData } from "@/lib/risk-mock-data";
import { useBusinessUnitStore, useActiveSector } from "@/hooks/use-business-unit";
import { sectorMeta } from "@/lib/business-units";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { RiskScoreGauge } from "@/components/risk-intelligence/risk-score-gauge";
import { formatIDR } from "@/lib/engines/scoring-engine";
import type { BranchRiskProfile, RiskLevel } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

export default function BranchRiskPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeSector = useActiveSector();
  const data = useMemo(() => getRiskData(activeBUId), [activeBUId]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BranchRiskProfile | null>(null);

  // Dynamic terminology
  const branchLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Kantor/Cabang" : "Branch/Outlet";
    return sectorMeta[activeSector].entityLabels.branch[language];
  }, [activeSector, language]);

  const customerLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Nasabah/Debitur/Pembeli" : "Customer/Debtor/Buyer";
    return sectorMeta[activeSector].entityLabels.customer[language];
  }, [activeSector, language]);

  const sorted = useMemo(() =>
    [...data.branchRiskProfiles]
      .sort((a, b) => b.totalScore - a.totalScore)
      .filter(b => {
        if (search && !b.outletName.toLowerCase().includes(search.toLowerCase()) && !b.branchName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
  , [search, data]);

  // Bar chart comparison data
  const comparisonData = useMemo(() => {
    const avgByRegion = new Map<string, { sum: number; count: number }>();
    for (const b of data.branchRiskProfiles) {
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
  }, [sorted, data]);

  // Historical trend for selected branch
  const branchHistory = useMemo(() => {
    if (!selected) return [];
    return data.riskScoreHistory
      .filter(h => h.entityId === selected.outletCode)
      .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  }, [selected, data]);

  const handleCompare = () => {
    alert(`Regional Branch Comparison:\n\nActive Branch: ${selected ? selected.name : "None selected"}\nRegional Average Risk Score: 64\nBranch Risk Score: ${selected ? selected.score : "N/A"}\nStatus: ${selected ? (selected.score > 64 ? "Above Regional Average (Needs Review)" : "Below Regional Average (Healthy)") : "Select a branch to compare"}`);
  };

  const handleDrillDown = () => {
    alert(`Drilling down into branch ${selected ? selected.name : "details"}:\n\n- Active Anomalies: ${selected ? selected.anomalies : 0}\n- High Risk Customers: ${selected ? selected.highRiskCust : 0}\n- Active Portfolio: ${selected ? selected.portfolio : "N/A"}`);
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={language === "id" ? `Kecerdasan Risiko ${branchLabel}` : `${branchLabel} Risk Intelligence`}
        subtitle={language === "id" ? `Papan peringkat risiko ${branchLabel.toLowerCase()}, analisis komparatif, kepadatan anomali, dan tren historis.` : `${branchLabel} risk leaderboard, comparative analysis, anomaly density, and historical trends.`}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
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
                      onClick={() => setSelected(b)}
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
    </div>
  );
}
