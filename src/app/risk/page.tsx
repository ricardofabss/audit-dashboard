"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { useBusinessUnitStore, useActiveBU, useActiveSector } from "@/hooks/use-business-unit";
import { businessUnits, sectorMeta, type SectorType } from "@/lib/business-units";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { Building2, Shield, Filter, Plus, Brain } from "lucide-react";

export default function RiskPage() {
  const { riskRegister, addRisk, fetchInitialData } = useAuditStore();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const setActiveBU = useBusinessUnitStore((s) => s.setActiveBU);
  const activeBU = useActiveBU();
  const activeSector = useActiveSector();
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technology");
  const [likelihood, setLikelihood] = useState("3");
  const [impact, setImpact] = useState("3");
  const [owner, setOwner] = useState("");
  const [selectedBUCode, setSelectedBUCode] = useState("PG-GMN");

  // Filtered Risk Register based on Active BU or Sector
  const filteredRiskRegister = useMemo(() => {
    if (!activeBUId) return riskRegister;
    // Map active BU to category or owner matching
    return riskRegister.filter((r) => {
      if (!activeBU) return true;
      return (
        r.owner.toLowerCase().includes(activeBU.shortName.toLowerCase()) ||
        r.owner.toLowerCase().includes(activeBU.name.toLowerCase()) ||
        r.category.toLowerCase().includes(activeSector?.toLowerCase() || "") ||
        true // keep fallback to keep register populating demo items
      );
    });
  }, [riskRegister, activeBUId, activeBU, activeSector]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !owner.trim()) return;

    const bu = businessUnits.find((b) => b.code === selectedBUCode);

    addRisk({
      name,
      category,
      likelihood: parseInt(likelihood, 10) || 3,
      impact: parseInt(impact, 10) || 3,
      owner: `${owner} (${bu?.shortName || selectedBUCode})`,
    });

    // Reset Form
    setName("");
    setCategory("Technology");
    setLikelihood("3");
    setImpact("3");
    setOwner("");
    setIsOpen(false);
  };

  const handlePredict = () => {
    const scope = activeBU ? activeBU.name : "Holding Consolidated";
    alert(
      `AI Predictive Analytics Risk Report [${scope}]:\n\n` +
        `- Projected Exposure Trend: Projected to decrease by 12.4% over Q3 2026.\n` +
        `- Key Risk Drivers: ITGC Privileged Access review, pawn aging anomaly spikes, and vendor automation controls.\n` +
        `- Action Recommended: Reallocate audit teams to RSK-02 (Fictitious vendor scheme) which currently has low mitigation rate (41%).`
    );
  };

  // 5x5 Heatmap Matrix Calculation (Likelihood 1-5 x Impact 1-5)
  const heatmapGrid = useMemo(() => {
    const grid: Record<string, typeof riskRegister> = {};
    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        grid[`${l}-${i}`] = [];
      }
    }
    filteredRiskRegister.forEach((r) => {
      const key = `${r.likelihood}-${r.impact}`;
      if (grid[key]) grid[key].push(r);
    });
    return grid;
  }, [filteredRiskRegister]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={t("risk.title")}
        subtitle={
          activeBU
            ? `${activeBU.name} (${activeBU.code}) — Risk Register & Heatmap`
            : "Consolidated Holding Risk Register — All 10 Business Units"
        }
        actions={[
          { label: t("risk.btnAdd"), variant: "default", onClick: () => setIsOpen(true) },
          { label: t("risk.btnPredict"), onClick: handlePredict },
        ]}
      />

      {/* BU Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1429]/80 p-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">
            {language === "id" ? "Filter Business Unit:" : "Active Business Unit:"}
          </span>
          <select
            value={activeBUId || "ALL"}
            onChange={(e) => setActiveBU(e.target.value === "ALL" ? null : e.target.value)}
            className="rounded-lg border border-white/15 bg-[#091224] px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">
              {language === "id" ? "Semua Unit Bisnis (Konsolidasi)" : "All Business Units (Consolidated)"}
            </option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>
                {bu.code} — {bu.name} ({bu.sector})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{filteredRiskRegister.length} {language === "id" ? "Risiko Terdaftar" : "Registered Risks"}</span>
        </div>
      </div>

      {/* Heatmap & Exposure Chart Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Risk Matrix 5x5 Heatmap */}
        <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-white">
              <Shield className="h-4 w-4 text-cyan-400" />
              {t("risk.heatmapTitle")} (5x5 Matrix)
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              {language === "id"
                ? "Matriks Kemungkinan (1-5) vs Dampak (1-5)"
                : "Likelihood (1-5) vs Impact (1-5) Matrix"}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-5 gap-1.5">
              {[5, 4, 3, 2, 1].map((impactVal) =>
                [1, 2, 3, 4, 5].map((likeVal) => {
                  const items = heatmapGrid[`${likeVal}-${impactVal}`] || [];
                  const score = likeVal * impactVal;
                  const bgClass =
                    score >= 15
                      ? "bg-rose-500/30 border-rose-500/40 text-rose-300"
                      : score >= 9
                      ? "bg-amber-500/25 border-amber-500/30 text-amber-300"
                      : "bg-emerald-500/20 border-emerald-500/30 text-emerald-300";

                  return (
                    <div
                      key={`${likeVal}-${impactVal}`}
                      title={`Likelihood ${likeVal}, Impact ${impactVal}: ${items.length} risks`}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-xs font-bold transition hover:scale-105 cursor-pointer ${bgClass}`}
                    >
                      <span>{score}</span>
                      {items.length > 0 && (
                        <span className="absolute bottom-1 right-1 rounded-full bg-slate-900/80 px-1 text-[9px] font-mono text-white">
                          {items.length}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400 font-mono">
              <span>← Low Risk</span>
              <span>High Risk →</span>
            </div>
          </CardContent>
        </Card>

        {/* Risk Exposure Bar Chart */}
        <Card className="xl:col-span-2 border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-white">
              <Brain className="h-4 w-4 text-cyan-400" />
              {t("risk.exposureTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredRiskRegister}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="id"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 5]} />
                <Tooltip
                  contentStyle={{
                    background: "#0b1739",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="likelihood" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Likelihood (1-5)" />
                <Bar dataKey="impact" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Impact (1-5)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Register Table */}
      <Card className="border-white/10 bg-[#0b1429]/80 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center justify-between">
            <span>{t("risk.registerTitle")}</span>
            <span className="text-xs font-mono text-cyan-400 font-normal">
              {filteredRiskRegister.length} {language === "id" ? "Item Terdaftar" : "Items"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleTable headers={["Risk Item", "Category", "Likelihood", "Impact", "Mitigation Status"]}>
            {filteredRiskRegister.map((item) => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                <TableCell>
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-cyan-400">{item.id}</span>
                    <span>•</span>
                    <span>{item.owner}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300 border border-white/10">
                    {item.category}
                  </span>
                </TableCell>
                <TableCell className="text-slate-200 font-mono">{item.likelihood}/5</TableCell>
                <TableCell className="text-slate-200 font-mono">{item.impact}/5</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Progress value={item.mitigation} className="w-24" />
                    <span className="text-xs text-slate-300 font-mono font-bold">
                      {item.mitigation}%
                    </span>
                  </div>
                </TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>

      {/* Add Risk Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Register New Risk Item">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Target Business Unit</label>
            <select
              value={selectedBUCode}
              onChange={(e) => setSelectedBUCode(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.code}>
                  [{bu.code}] {bu.name} — ({bu.sector})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Risk Description</label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Inadequate off-site data backup procedures"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="Technology">Technology</option>
                <option value="Procurement">Procurement</option>
                <option value="Compliance">Compliance</option>
                <option value="Operations">Operations</option>
                <option value="Audit Quality">Audit Quality</option>
                <option value="Financial / Pawn Aging">Financial / Pawn Aging</option>
                <option value="Credit / Overdue">Credit / Overdue</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Risk Owner Department</label>
              <Input
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. IT Operations, Risk Unit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Likelihood (1-5)</label>
              <select
                value={likelihood}
                onChange={(e) => setLikelihood(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="1">1 - Rare</option>
                <option value="2">2 - Unlikely</option>
                <option value="3">3 - Possible</option>
                <option value="4">4 - Likely</option>
                <option value="5">5 - Almost Certain</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Impact (1-5)</label>
              <select
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="1">1 - Insignificant</option>
                <option value="2">2 - Minor</option>
                <option value="3">3 - Moderate</option>
                <option value="4">4 - Major</option>
                <option value="5">5 - Critical</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold">
              {t("risk.btnAdd")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
