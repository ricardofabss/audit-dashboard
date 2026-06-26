"use client";

import { useState } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export default function RiskPage() {
  const { riskRegister, addRisk } = useAuditStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technology");
  const [likelihood, setLikelihood] = useState("3");
  const [impact, setImpact] = useState("3");
  const [owner, setOwner] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !owner.trim()) return;

    addRisk({
      name,
      category,
      likelihood: parseInt(likelihood, 10) || 3,
      impact: parseInt(impact, 10) || 3,
      owner,
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
    alert("AI Predictive Analytics:\n\n- Risk exposure is projected to decrease by 12.4% over the next quarter.\n- Key Drivers: Progress in ITGC Privileged Access review and increased vendor-control automation.\n- Recommended Action: Focus resources on mitigating RSK-02 (Fictitious vendor scheme) which currently has the lowest mitigation rate (41%).");
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("risk.title")}
        subtitle={t("risk.subtitle")}
        actions={[
          { label: t("risk.btnAdd"), variant: "default", onClick: () => setIsOpen(true) },
          { label: t("risk.btnPredict"), onClick: handlePredict },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("risk.heatmapTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-5 gap-1">
            {Array.from({ length: 25 }).map((_, idx) => {
              const v = idx + 1;
              const cls =
                v > 18 ? "bg-rose-400/30" : v > 10 ? "bg-amber-300/25" : "bg-emerald-300/25";
              return <div key={v} className={`aspect-square rounded-md border border-white/10 ${cls}`} />;
            })}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("risk.exposureTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskRegister}>
                <XAxis dataKey="id" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)" }} />
                <Bar dataKey="likelihood" fill="#22d3ee" radius={6} name="Likelihood" />
                <Bar dataKey="impact" fill="#fbbf24" radius={6} name="Impact" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("risk.registerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleTable headers={["Risk", "Category", "Likelihood", "Impact", "Mitigation"]}>
            {riskRegister.map((item) => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                <TableCell>
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-xs text-slate-500">
                    {item.id} • {item.owner}
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">{item.category}</TableCell>
                <TableCell className="text-slate-300">{item.likelihood}</TableCell>
                <TableCell className="text-slate-300">{item.impact}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={item.mitigation} className="w-16" />
                    <span className="text-xs text-slate-400 font-mono">{item.mitigation}%</span>
                  </div>
                </TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>

      {/* Add Risk Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Register New Risk">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
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
