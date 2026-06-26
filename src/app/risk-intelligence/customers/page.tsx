"use client";

import { useMemo, useState } from "react";
import { Users, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { getRiskData } from "@/lib/risk-mock-data";
import { useBusinessUnitStore } from "@/hooks/use-business-unit";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { RiskScoreGauge } from "@/components/risk-intelligence/risk-score-gauge";
import { AnomalyRuleBadge } from "@/components/risk-intelligence/anomaly-rule-badge";
import type { CustomerRiskProfile, RiskLevel } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

export default function CustomerRiskPage() {
  const { t } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const data = useMemo(() => getRiskData(activeBUId), [activeBUId]);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<RiskLevel | "ALL">("ALL");
  const [selected, setSelected] = useState<CustomerRiskProfile | null>(null);

  const sortedCustomers = useMemo(() =>
    [...data.customerRiskProfiles]
      .sort((a, b) => b.totalScore - a.totalScore)
      .filter(c => {
        if (filterLevel !== "ALL" && c.riskLevel !== filterLevel) return false;
        if (search && !c.customerName.toLowerCase().includes(search.toLowerCase()) && !c.cifNumber.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
  , [search, filterLevel, data]);

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
    const label = selected ? selected.name : "Active_Customer";
    const content = `AuditSphere AI - Customer Risk Ranking Profile\n============================================\nCustomer: ${label}\nRisk Score: ${selected ? selected.score : "N/A"}\nRisk Level: ${selected ? selected.level : "N/A"}\nGenerated: ${new Date().toLocaleString()}`;
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Customer_Risk_Report_${label.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("ri.custTitle")}
        subtitle={t("ri.custSubtitle")}
        actions={[
          { label: t("ri.btnFlagInvestigation"), variant: "default", onClick: handleFlagInvestigation },
          { label: t("ri.btnGenerateReport"), onClick: handleGenerateReport },
        ]}
      />

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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
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
            <div className="mt-3 text-center text-xs text-slate-500">{sortedCustomers.length} customers</div>
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
                <Users className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">Select a customer to view risk details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
