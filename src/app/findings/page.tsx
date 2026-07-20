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
import { CheckCircle2, Folder, Building2 } from "lucide-react";
import type { Severity, Status } from "@/types/audit";
import { businessUnits } from "@/lib/business-units";

export default function FindingsPage() {
  const { findings, addFinding, approveFinding } = useAuditStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const [selectedFindingDetail, setSelectedFindingDetail] = useState<typeof findings[0] | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<"All" | "Critical" | "High" | "Medium" | "Low">("All");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Completed" | "All">("Active");

  // Form states
  const [title, setTitle] = useState("");
  const [branch, setBranch] = useState(businessUnits[0]?.name || "");
  const [owner, setOwner] = useState("");
  const [severity, setSeverity] = useState<Severity>("High");
  const [status, setStatus] = useState<Status>("Open");
  const [sla, setSla] = useState("Due in 7 days");
  const [actionPlan, setActionPlan] = useState("");

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
      actionPlan: actionPlan.trim() || "Pending action plan",
      risk: severity === "Critical" ? 95 : severity === "High" ? 75 : severity === "Medium" ? 50 : 25,
    });

    // Reset Form
    setTitle("");
    setOwner("");
    setBranch(businessUnits[0]?.name || "");
    setSeverity("High");
    setStatus("Open");
    setSla("Due in 7 days");
    setActionPlan("");
    setIsOpen(false);
  };

  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity === "All") return true;
    return f.severity === selectedSeverity;
  });

  const groupedFindingsByBranch = Object.entries(
    filteredFindings.reduce((acc, item) => {
      const branchName = item.branch || "Lainnya";
      if (!acc[branchName]) acc[branchName] = {};
      
      const auditName = item.auditName || "Pemeriksaan Umum";
      if (!acc[branchName][auditName]) acc[branchName][auditName] = [];
      
      acc[branchName][auditName].push(item);
      return acc;
    }, {} as Record<string, Record<string, typeof findings>>)
  );

  const branches = groupedFindingsByBranch.map(([branchName]) => branchName);
  const actualActiveTab = branches.includes(activeTab) ? activeTab : branches[0] || "";
  const activeAudits = groupedFindingsByBranch.find(([b]) => b === actualActiveTab)?.[1] || {};

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("findings.title")}
        subtitle={t("findings.subtitle")}
        actions={[
          { label: t("findings.btnCreate"), variant: "default", onClick: () => setIsOpen(true) },
        ]}
      />

      {/* Filter Bar */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="text-sm font-medium text-slate-300">Severity:</div>
          <div className="flex gap-2">
            {(["All", "Critical", "High", "Medium", "Low"] as const).map((sev) => (
              <Badge
                key={sev}
                tone={selectedSeverity === sev ? "cyan" : "slate"}
                className={`cursor-pointer transition-all ${
                  selectedSeverity === sev ? "ring-2 ring-cyan-500/50" : "opacity-60 hover:opacity-100"
                }`}
                onClick={() => setSelectedSeverity(sev)}
              >
                {sev}
              </Badge>
            ))}
          </div>

          <div className="w-px h-6 bg-white/10 mx-2" />

          <div className="text-sm font-medium text-slate-300">Status:</div>
          <div className="flex gap-2">
            {(["Active", "Completed", "All"] as const).map((status) => (
              <Badge
                key={status}
                tone={statusFilter === status ? "emerald" : "slate"}
                className={`cursor-pointer transition-all ${
                  statusFilter === status ? "ring-2 ring-emerald-500/50" : "opacity-60 hover:opacity-100"
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {groupedFindingsByBranch.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("findings.registerTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <div className="text-center text-slate-500 py-8">{t("findings.empty")}</div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left Sidebar for Branches */}
          <div className="md:col-span-1 space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">
              Business Units
            </div>
            {branches.map((branch) => (
              <button
                key={branch}
                onClick={() => setActiveTab(branch)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  actualActiveTab === branch
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(6,182,212,0.15)] font-medium"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Building2 className={`w-4 h-4 ${actualActiveTab === branch ? "text-cyan-400" : "text-slate-500"}`} />
                <span className="truncate">{branch}</span>
              </button>
            ))}
          </div>

          {/* Right Content for Active Branch */}
          <div className="md:col-span-3 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-white tracking-tight">{actualActiveTab}</h2>
              <Badge tone="slate" className="font-mono">{Object.keys(activeAudits).length} Audits</Badge>
            </div>

            <div className="space-y-6 max-h-[600px] overflow-y-auto relative pr-2">
              {Object.entries(activeAudits).map(([auditName, items]) => (
                <div key={auditName} className="rounded-2xl border border-white/10 bg-[#0a1120] overflow-hidden shadow-lg">
                  <div className="bg-white/[0.02] border-b border-white/5 px-5 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200">{auditName}</h3>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider">{items.length} Findings</p>
                    </div>
                  </div>
                  <div className="p-0">
                    <ModuleTable headers={["Finding", "Severity", "Status", "SLA", "Follow-up"]}>
                      {items
                        .filter(item => {
                          if (statusFilter === "All") return true;
                          const isCompleted = item.status === "Resolved";
                          if (statusFilter === "Completed") return isCompleted;
                          return !isCompleted;
                        })
                        .map((item) => (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                          <TableCell>
                            <div className="font-medium text-white">{item.title}</div>
                            <div className="text-xs text-slate-500">
                              {item.id} • Owner: {item.owner}
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
                                  : item.status === "Draft"
                                  ? "yellow"
                                  : "indigo"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">{item.sla}</TableCell>
                          <TableCell>
                            {item.status === "Draft" ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => approveFinding(item.id)}
                                className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 h-7 text-xs"
                              >
                                Approve
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setSelectedFindingDetail(item)}
                                className="h-7 text-xs text-cyan-400 hover:text-cyan-300"
                              >
                                {t("findings.btnView")}
                              </Button>
                            )}
                          </TableCell>
                        </tr>
                      ))}
                    </ModuleTable>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.name}>
                    {bu.name}
                  </option>
                ))}
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
              <label className="mb-1 block text-xs font-medium text-slate-400">{t("findings.workflowStatus")}</label>
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
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Action Plan</label>
            <textarea
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder="Detail the remediation plan to address this finding..."
              className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none min-h-[80px]"
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

      {/* View Detail Modal */}
      {selectedFindingDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedFindingDetail(null)}
          title={`Detail Temuan: ${selectedFindingDetail.id}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-sm">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <h3 className="font-semibold text-white text-base mb-1">{selectedFindingDetail.title}</h3>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  Batas Waktu: {selectedFindingDetail.sla || "-"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  Keparahan: {selectedFindingDetail.severity}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  PIC: {selectedFindingDetail.owner}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                Uraian Temuan Lengkap
              </label>
              <div className="rounded-lg bg-black/40 p-4 text-slate-200 border border-white/5 leading-relaxed whitespace-pre-wrap">
                {selectedFindingDetail.description || selectedFindingDetail.title}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedFindingDetail(null)} variant="outline">
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
