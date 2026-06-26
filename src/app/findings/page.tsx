"use client";

import { useState } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import type { Severity, Status } from "@/types/audit";

export default function FindingsPage() {
  const { findings, addFinding } = useAuditStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | "All">("All");

  // Form states
  const [title, setTitle] = useState("");
  const [branch, setBranch] = useState("Jakarta Operations");
  const [owner, setOwner] = useState("");
  const [severity, setSeverity] = useState<Severity>("High");
  const [status, setStatus] = useState<Status>("Open");
  const [sla, setSla] = useState("Due in 7 days");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !owner.trim()) return;

    addFinding({
      title,
      branch,
      owner,
      severity,
      status,
      sla,
      risk: severity === "Critical" ? 95 : severity === "High" ? 75 : severity === "Medium" ? 50 : 25,
    });

    // Reset Form
    setTitle("");
    setOwner("");
    setBranch("Jakarta Operations");
    setSeverity("High");
    setStatus("Open");
    setSla("Due in 7 days");
    setIsOpen(false);
  };

  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity === "All") return true;
    return f.severity === selectedSeverity;
  });

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("findings.title")}
        subtitle={t("findings.subtitle")}
        actions={[
          { label: t("findings.btnCreate"), variant: "default", onClick: () => setIsOpen(true) },
          { label: t("findings.btnFilter"), onClick: () => setShowFilters(!showFilters) },
        ]}
      />

      {showFilters && (
        <Card className="p-4 border-white/10 bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter Severity:</span>
            <div className="flex flex-wrap gap-1.5">
              {(["All", "Critical", "High", "Medium", "Low"] as const).map((sev) => (
                <Button
                  key={sev}
                  variant={selectedSeverity === sev ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSeverity(sev)}
                  className="h-8 text-xs px-3"
                >
                  {sev}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("findings.registerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleTable headers={["Finding", "Severity", "Status", "SLA", "Follow-up"]}>
            {filteredFindings.map((item) => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                <TableCell>
                  <div className="font-medium text-white">{item.title}</div>
                  <div className="text-xs text-slate-500">
                    {item.id} • {item.branch} • Owner: {item.owner}
                  </div>
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={item.severity} />
                </TableCell>
                <TableCell>
                  <Badge
                    tone={
                      item.status === "Resolved"
                        ? "emerald"
                        : item.status === "Escalated"
                        ? "red"
                        : item.status === "In Progress"
                        ? "cyan"
                        : "indigo"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-300">{item.sla}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={item.progress} className="w-16" />
                    <span className="text-xs text-slate-400">{item.progress}%</span>
                  </div>
                </TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>

      {/* Create Finding Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Log New Audit Finding">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Finding Title / Detail</label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Excessive login failures pattern in Active Directory"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Location Branch</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-400">Remediation Owner</label>
              <Input
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Owner's full name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Workflow Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Escalated">Escalated</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">SLA Timeline</label>
            <Input
              value={sla}
              onChange={(e) => setSla(e.target.value)}
              placeholder="e.g. Due in 14 days, Overdue 2 days"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold">
              {t("findings.btnCreate")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
