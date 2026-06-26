"use client";

import { useMemo, useState } from "react";
import { UserCog, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { getRiskData } from "@/lib/risk-mock-data";
import { useBusinessUnitStore, useActiveSector } from "@/hooks/use-business-unit";
import { sectorMeta } from "@/lib/business-units";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { RiskScoreGauge } from "@/components/risk-intelligence/risk-score-gauge";
import { AnomalyRuleBadge } from "@/components/risk-intelligence/anomaly-rule-badge";
import type { OfficerRiskProfile } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

export default function OfficerRiskPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeSector = useActiveSector();
  const data = useMemo(() => getRiskData(activeBUId), [activeBUId]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OfficerRiskProfile | null>(null);

  // Dynamic terminology
  const officerLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Petugas/Penaksir" : "Officer/Appraiser";
    return sectorMeta[activeSector].entityLabels.officer[language];
  }, [activeSector, language]);

  const branchLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Kantor/Cabang" : "Branch/Outlet";
    return sectorMeta[activeSector].entityLabels.branch[language];
  }, [activeSector, language]);

  const sorted = useMemo(() =>
    [...data.officerRiskProfiles]
      .sort((a, b) => b.totalScore - a.totalScore)
      .filter(o => {
        if (search && !o.officerName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
  , [search, data]);

  const topOfficerChart = useMemo(() =>
    sorted.slice(0, 12).map(o => ({
      name: o.officerName.split(",")[0].split(" ").slice(-1)[0],
      score: o.totalScore,
      gap: o.supervisoryGapScore,
      fill: o.totalScore >= 80 ? "#ef4444" : o.totalScore >= 60 ? "#f59e0b" : o.totalScore >= 35 ? "#eab308" : "#22c55e",
    }))
  , [sorted]);

  const handleReviewOfficer = () => {
    alert(`Reviewing ${officerLabel}:\n\nActive Target: ${selected ? selected.officerName : "None selected"}\nPosition: ${selected ? selected.position : "N/A"}\nRisk Score: ${selected ? selected.totalScore : "N/A"}\nSupervisory Gap: ${selected ? selected.supervisoryGapScore : "N/A"}\nAction: Internal audit review case logged.`);
  };

  const handleSupervisoryReport = () => {
    const element = document.createElement("a");
    const name = selected ? selected.officerName : "Active_Officer";
    const content = `AuditSphere AI - Officer Supervisory Risk Audit Report\n======================================================\nOfficer: ${name}\nPosition: ${selected ? selected.position : "N/A"}\nRisk Score: ${selected ? selected.totalScore : "N/A"}\nSupervisory Gap Index: ${selected ? selected.supervisoryGapScore : "N/A"}\nGenerated: ${new Date().toLocaleString()}`;
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Supervisory_Report_${name.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={language === "id" ? `Kecerdasan Risiko ${officerLabel}` : `${officerLabel} Risk Intelligence`}
        subtitle={language === "id" ? `Peringkat risiko ${officerLabel.toLowerCase()}, analisis celah pengawasan, dan metrik penanganan anomali.` : `${officerLabel} risk ranking, supervisory gap analysis, and anomaly handling metrics.`}
        actions={[
          { label: t("ri.btnReviewOfficer"), variant: "default", onClick: handleReviewOfficer },
          { label: t("ri.btnSupervisoryReport"), onClick: handleSupervisoryReport },
        ]}
      />

      {/* Officer Risk Overview Chart */}
      <Card>
        <CardHeader><CardTitle>{language === "id" ? `Metrik Penanganan ${officerLabel}` : `${officerLabel} Handling Metrics`}</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topOfficerChart}>
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={16} name="Risk Score">
                {topOfficerChart.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
              <Bar dataKey="gap" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} name="Supervisory Gap" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Officer Table */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>{language === "id" ? `Peringkat Risiko ${officerLabel}` : `${officerLabel} Risk Ranking`}</CardTitle>
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
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{officerLabel}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.position")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{branchLabel}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.score")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.level")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.anomalies")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.supervisoryGap")}</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("ri.trend")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((o, idx) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-b border-white/5 cursor-pointer transition ${selected?.id === o.id ? "bg-cyan-500/10" : "hover:bg-white/[0.02]"}`}
                      onClick={() => setSelected(o)}
                    >
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm font-medium text-white">{o.officerName}</div>
                        <div className="text-[10px] text-slate-500">{o.officerId}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-300">{o.position}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-300">{o.outletName}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-sm font-bold" style={{ color: o.totalScore >= 80 ? "#ef4444" : o.totalScore >= 60 ? "#f59e0b" : o.totalScore >= 35 ? "#eab308" : "#22c55e" }}>
                          {o.totalScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><RiskLevelIndicator level={o.riskLevel} /></td>
                      <td className="px-3 py-2.5 text-xs text-slate-300 font-mono">{o.anomalyCount}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-mono font-bold ${o.supervisoryGapScore > 20 ? "text-rose-400" : o.supervisoryGapScore > 10 ? "text-amber-400" : "text-emerald-400"}`}>
                          {o.supervisoryGapScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${o.trendDirection === "UP" ? "text-rose-400" : o.trendDirection === "DOWN" ? "text-emerald-400" : "text-slate-400"}`}>
                          {o.trendDirection === "UP" ? <ArrowUpRight className="h-3 w-3" /> : o.trendDirection === "DOWN" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {o.trend > 0 ? "+" : ""}{o.trend}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <CardContent className="flex flex-col items-center gap-4 pt-6">
                  <RiskScoreGauge score={selected.totalScore} size={110} />
                  <div className="text-center">
                    <div className="text-sm font-semibold text-white">{selected.officerName}</div>
                    <div className="text-xs text-slate-400">{selected.position}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{selected.outletName} • {selected.branchName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full text-center">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-cyan-300">{selected.handledTransactions}</div>
                      <div className="text-[10px] text-slate-500">{t("ri.handledTxn")}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <div className="text-lg font-bold font-mono text-amber-300">{selected.anomalyCount}</div>
                      <div className="text-[10px] text-slate-500">{t("ri.anomalies")}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2 col-span-2">
                      <div className={`text-lg font-bold font-mono ${selected.supervisoryGapScore > 20 ? "text-rose-400" : "text-emerald-400"}`}>
                        {selected.supervisoryGapScore}/40
                      </div>
                      <div className="text-[10px] text-slate-500">{t("ri.supervisoryGap")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                <UserCog className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">
                  {language === "id" ? `Pilih ${officerLabel.toLowerCase()} untuk melihat detail` : `Select an ${officerLabel.toLowerCase()} to view details`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
