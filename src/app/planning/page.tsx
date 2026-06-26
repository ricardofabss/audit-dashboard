"use client";

import { useState, useEffect } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export default function PlanningPage() {
  const { audits, addAudit } = useAuditStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form states
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("Jakarta Operations");
  const [lead, setLead] = useState("");
  const [risk, setRisk] = useState("High");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("create=true")) {
      setIsOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("create");
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  const handleScrollToCalendar = () => {
    const element = document.getElementById("calendar-card");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !lead.trim()) return;

    addAudit({
      name,
      branch,
      lead,
      risk,
      status: "Planning",
    });

    // Reset form
    setName("");
    setLead("");
    setBranch("Jakarta Operations");
    setRisk("High");
    setIsOpen(false);
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("plan.title")}
        subtitle={t("plan.subtitle")}
        actions={[
          { label: t("plan.btnCreate"), variant: "default", onClick: () => setIsOpen(true) },
          { label: t("plan.btnCalendar"), onClick: handleScrollToCalendar },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card id="calendar-card" className="xl:col-span-2 scroll-mt-6">
          <CardHeader>
            <CardTitle>{t("plan.calendarTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="text-slate-500 font-medium">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-lg border border-white/10 bg-black/20 p-1 text-left text-[11px] text-slate-400"
                >
                  {idx % 5 === 0 ? (
                    <Badge tone="cyan">AUD</Badge>
                  ) : idx % 8 === 0 ? (
                    <Badge tone="amber">RISK</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("plan.riskMatrix")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-5 gap-1">
            {Array.from({ length: 25 }).map((_, idx) => {
              const val = idx + 1;
              const tone =
                val > 18 ? "bg-rose-400/25" : val > 10 ? "bg-amber-300/20" : "bg-emerald-300/20";
              return <div key={val} className={`aspect-square rounded-md border border-white/10 ${tone}`} />;
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("plan.plannedAudits")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleTable headers={["Audit", "Branch", "Lead", "Status", "Progress"]}>
            {audits.map((audit) => (
              <tr key={audit.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                <TableCell>
                  <div className="font-medium text-white">{audit.name}</div>
                  <div className="text-xs text-slate-500">{audit.id}</div>
                </TableCell>
                <TableCell className="text-slate-300">{audit.branch}</TableCell>
                <TableCell className="text-slate-300">{audit.lead}</TableCell>
                <TableCell>
                  <Badge tone={audit.status === "In Progress" || audit.status === "Fieldwork" ? "cyan" : "indigo"}>
                    {audit.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-300">{audit.progress}%</TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>

      {/* Create Plan Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t("plan.modalTitle")}>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Audit Engagement Name</label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Procurement Audit"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Target Branch / Location</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="Jakarta Operations">Jakarta Operations</option>
              <option value="APAC Headquarters">APAC Headquarters</option>
              <option value="EMEA Nordics">EMEA Nordics</option>
              <option value="North America West">North America West</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Lead Auditor</label>
            <Input
              required
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Initial Risk Assessment</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
              <option value="Critical">Critical Risk</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold">
              {t("plan.btnCreate")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
