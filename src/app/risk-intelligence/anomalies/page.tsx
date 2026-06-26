"use client";

import { useMemo, useState, useEffect } from "react";
import { Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

import { useBusinessUnitStore } from "@/hooks/use-business-unit";
import { AnomalyRuleBadge, getAnomalyRuleColor } from "@/components/risk-intelligence/anomaly-rule-badge";
import { RiskLevelIndicator } from "@/components/risk-intelligence/risk-level-indicator";
import type { AnomalyRuleCode, AnomalyStatus, RiskMockDataSet } from "@/types/risk-intelligence";

const tooltipStyle = { contentStyle: { background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", fontSize: "12px" } };

const statusColors: Record<AnomalyStatus, string> = {
  DETECTED: "#ef4444", CONFIRMED: "#f59e0b", INVESTIGATING: "#3b82f6", DISMISSED: "#6b7280", RESOLVED: "#22c55e",
};

export default function AnomalyMonitorPage() {
  const { t, language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const [data, setData] = useState<RiskMockDataSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const url = `/api/risk-intelligence` + (activeBUId ? `?buId=${activeBUId}` : "");

    fetch(url)
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
  }, [activeBUId]);

  const [filterRule, setFilterRule] = useState<AnomalyRuleCode | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<AnomalyStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.anomalyDetections.filter(a => {
      if (filterRule !== "ALL" && a.ruleCode !== filterRule) return false;
      if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
      if (search && !a.entityName.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filterRule, filterStatus, search, data]);

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
    const element = document.createElement("a");
    const content = `AuditSphere AI - Anomaly Register Report\n======================================\nGenerated: ${new Date().toLocaleString()}\n\nRegistered Anomaly Rules: ${ruleKeys.length}\nActive Status Categories: ${statusKeys.join(", ")}`;
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "Anomalies_Register.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
          { label: t("ri.btnFilterRules"), variant: "default", onClick: handleFilterRules },
          { label: t("ri.btnExportAnomalies"), onClick: handleExportAnomalies },
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-white/10 text-left">
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
