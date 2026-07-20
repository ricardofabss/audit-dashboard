"use client";

import { useMemo, useState, useEffect } from "react";
import { Zap, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

import { useBusinessUnitStore, useActiveBU } from "@/hooks/use-business-unit";
import { AnomalyRuleBadge, getAnomalyRuleColor } from "@/components/risk-intelligence/anomaly-rule-badge";
import type { AnomalyRuleCode, AnomalyStatus, RiskMockDataSet } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

const statusColors: Record<AnomalyStatus, string> = {
  DETECTED: "#ef4444", CONFIRMED: "#f59e0b", INVESTIGATING: "#3b82f6", DISMISSED: "#6b7280", RESOLVED: "#22c55e",
};

export default function AnomalyMonitorPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeBU = useActiveBU();
  const validBUId = activeBU ? activeBU.id : null;
  const [data, setData] = useState<RiskMockDataSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiRecommendations, setAiRecommendations] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const url = `/api/risk-intelligence` + (validBUId ? `?buId=${validBUId}&_t=${Date.now()}` : `?_t=${Date.now()}`);

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

  const [filterRule, setFilterRule] = useState<AnomalyRuleCode | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<AnomalyStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.anomalyDetections.filter(a => {
      if (filterRule !== "ALL" && a.ruleCode !== filterRule) return false;
      if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
      if (search && !a.entityName.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
      
      if (startDate && a.detectedAt < startDate) return false;
      if (endDate && a.detectedAt > endDate) return false;

      return true;
    });
  }, [filterRule, filterStatus, search, startDate, endDate, data]);

  const ruleDistribution = useMemo(() => {
    if (!data) return [];
    const counts = new Map<AnomalyRuleCode, number>();
    for (const a of data.anomalyDetections) counts.set(a.ruleCode, (counts.get(a.ruleCode) || 0) + 1);
    return data.anomalyRules.map(r => ({
      code: r.code, name: language === "id" ? r.nameId : r.name,
      count: counts.get(r.code) || 0, fill: getAnomalyRuleColor(r.code),
    }));
  }, [language, data]);

  const statusDistribution = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    for (const a of data.anomalyDetections) counts[a.status] = (counts[a.status] || 0) + 1;
    return (Object.entries(statusColors) as [AnomalyStatus, string][]).map(([status, fill]) => ({
      name: t(`ri.${status.toLowerCase()}` as any), value: counts[status] || 0, fill,
    }));
  }, [t, data]);

  const statusKeys: AnomalyStatus[] = ["DETECTED", "CONFIRMED", "INVESTIGATING", "DISMISSED", "RESOLVED"];
  const ruleKeys = useMemo(() => {
    if (!data) return [];
    return data.anomalyRules.map(r => r.code);
  }, [data]);

  const handleFilterRules = () => {
    alert(`Filter Rules Panel:\n\nActive rules: ${ruleKeys.join(", ")}\nFilters applied: All rules active. Click an individual chart bar to drill down.`);
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

    // Build HTML table for Excel (.xls)
    let htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    htmlContent += `<head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Ringkasan Anomali</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>`;
    htmlContent += `<body><table border="1">`;
    
    // Headers
    htmlContent += `<tr>` + headers.map(h => `<th style="background-color: #f2f2f2;">${h}</th>`).join("") + `</tr>`;

    // Rows
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

    // Collect all unique transaction IDs from the filtered anomalies
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

  const handleGenerateAI = async (anomaly: any) => {
    setAiLoading(prev => ({ ...prev, [anomaly.id]: true }));
    try {
      const res = await fetch("/api/ai/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anomaly })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || "Failed to generate AI recommendation");
      }
      const result = await res.json();
      setAiRecommendations(prev => ({ ...prev, [anomaly.id]: result.recommendation }));
    } catch (err: any) {
      console.error(err);
      alert((language === "id" ? "Gagal memanggil AI Investigator: " : "Failed to call AI Investigator: ") + err.message);
    } finally {
      setAiLoading(prev => ({ ...prev, [anomaly.id]: false }));
    }
  };

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

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("ri.anomalyTitle")}
        subtitle={t("ri.anomalySubtitle")}
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
                                        <Sparkles className="h-4 w-4 text-cyan-400" />
                                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                          AI Investigator Insight
                                        </span>
                                      </div>
                                      {!aiRecommendations[a.id] && !aiLoading[a.id] && (
                                        <button
                                          onClick={() => handleGenerateAI(a)}
                                          className="text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full hover:bg-cyan-500/30 transition-colors"
                                        >
                                          {language === "id" ? "Analisis Sejarah & Buat Rencana" : "Analyze History & Plan"}
                                        </button>
                                      )}
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
    </div>
  );
}
