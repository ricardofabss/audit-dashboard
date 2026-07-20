"use client";

import { useMemo, useState, useEffect } from "react";
import { Building2, ArrowUpRight, ArrowDownRight, Minus, Sparkles, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU, useActiveSector } from "@/hooks/use-business-unit";
import { sectorMeta } from "@/lib/business-units";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import { RiskScoreGauge } from "@/components/risk-intelligence/risk-score-gauge";
import { formatIDR } from "@/lib/engines/scoring-engine";
import type { BranchRiskProfile, RiskLevel } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

export default function BranchRiskPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
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

  useEffect(() => {
    if (data && !execSummary && !execSummaryLoading) {
      setExecSummaryLoading(true);
      
      const branchSummaryData = data.branchRiskProfiles.map((b: any) => ({
        cabang: b.branchName,
        region: b.regionName,
        skor: b.totalScore,
        level: b.riskLevel,
        anomali: b.anomalyCount
      })).sort((a: any, b: any) => b.skor - a.skor).slice(0, 20); // Top 20 terburuk

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
  }, [data, execSummary, execSummaryLoading]);

  const handleGenerateAI = async () => {
    if (!selected || !data) return;
    setAiLoading(true);
    try {
      // Dapatkan anomali khusus untuk cabang ini dari data real yang ada di frontend
      const branchAnomalies = data.anomalyDetections
        .filter((a: any) => a.outletCode === selected.outletCode)
        .sort((a: any, b: any) => b.riskScore - a.riskScore)
        .slice(0, 5)
        .map((a: any) => `- [Score: ${a.riskScore}] ${a.ruleName}: ${a.description}`)
        .join("\n");

      // Buat dump database dari data real
      const databaseDump = data.anomalyDetections.map((a: any) => ({
        cabang: a.branchName,
        rule: a.ruleName,
        skor: a.riskScore,
        status: a.status
      }));

      // Hitung top global patterns
      const ruleFrequency: Record<string, {name: string, count: number}> = {};
      data.anomalyDetections.forEach((a: any) => {
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

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const url = `/api/risk-intelligence` + (validBUId ? `?buId=${validBUId}&_t=${Date.now()}` : `?_t=${Date.now()}`);

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

  // Dynamic terminology
  const branchLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Kantor/Cabang" : "Branch/Outlet";
    return sectorMeta[activeSector].entityLabels.branch[language];
  }, [activeSector, language]);

  const customerLabel = useMemo(() => {
    if (!activeSector) return language === "id" ? "Nasabah/Debitur/Pembeli" : "Customer/Debtor/Buyer";
    return sectorMeta[activeSector].entityLabels.customer[language];
  }, [activeSector, language]);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.branchRiskProfiles]
      .sort((a: any, b: any) => b.totalScore - a.totalScore)
      .filter((b: any) => {
        if (search && !b.outletName.toLowerCase().includes(search.toLowerCase()) && !b.branchName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
  }, [search, data]);

  // Bar chart comparison data
  const comparisonData = useMemo(() => {
    if (!data) return [];
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
    alert(`Regional Branch Comparison:\n\nActive Branch: ${selected ? selected.branchName : "None selected"}\nRegional Average Risk Score: 64\nBranch Risk Score: ${selected ? selected.totalScore : "N/A"}\nStatus: ${selected ? (selected.totalScore > 64 ? "Above Regional Average (Needs Review)" : "Below Regional Average (Healthy)") : "Select a branch to compare"}`);
  };

  const handleDrillDown = () => {
    alert(`Drilling down into branch ${selected ? selected.branchName : "details"}:\n\n- Active Anomalies: ${selected ? selected.anomalyCount : 0}\n- High Risk Customers: ${selected ? selected.highRiskCustomerCount : 0}\n- Customers: ${selected ? selected.customerCount : "N/A"}`);
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={language === "id" ? `Kecerdasan Anomali ${branchLabel}` : `${branchLabel} Anomaly Intelligence`}
        subtitle={language === "id" ? `Papan peringkat risiko ${branchLabel.toLowerCase()}, analisis komparatif, kepadatan anomali, dan tren historis.` : `${branchLabel} risk leaderboard, comparative analysis, anomaly density, and historical trends.`}
        actions={[
          { label: t("ri.btnCompare"), variant: "default", onClick: handleCompare },
          { label: t("ri.btnDrillDown"), onClick: handleDrillDown },
        ]}
      />

      {/* Executive AI Summary */}
      {(execSummaryLoading || execSummary) && (
        <Card className="border-cyan-500/30 bg-gradient-to-br from-[#0f172a] to-[#0b1739] shadow-lg shadow-cyan-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles className="w-24 h-24 text-cyan-400" />
          </div>
          <CardContent className="p-5 flex gap-4 items-start relative z-10">
            <div className="mt-1 flex-shrink-0 bg-cyan-500/20 p-2 rounded-lg border border-cyan-500/30">
              {execSummaryLoading ? <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /> : <Sparkles className="w-5 h-5 text-cyan-400" />}
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
      )}

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
    </div>
  );
}
