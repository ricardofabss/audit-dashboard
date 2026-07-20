"use client";

import { useState } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { Building2, Folder } from "lucide-react";

export default function FollowUpPage() {
  const { findings, updateFindingProgress } = useAuditStore();
  const { t } = useTranslation();
  const [selectedFinding, setSelectedFinding] = useState<typeof findings[0] | null>(null);
  const [progressVal, setProgressVal] = useState("0");
  const [mitigationResponse, setMitigationResponse] = useState("");
  const [activeTab, setActiveTab] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Completed" | "All">("Active");

  const handleOpenUpdate = (finding: typeof findings[0]) => {
    setSelectedFinding(finding);
    setProgressVal(String(finding.progress));
    setMitigationResponse("");
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinding) return;

    const val = Math.min(100, Math.max(0, parseInt(progressVal, 10) || 0));
    updateFindingProgress(selectedFinding.id, val);
    setSelectedFinding(null);
  };

  const sendReminders = () => {
    const uncompleted = findings.filter((f) => f.progress < 100);
    if (uncompleted.length === 0) {
      alert("All findings are fully resolved! No reminders needed.");
      return;
    }
    const list = uncompleted.map((f) => `${f.id} (${f.owner})`).join("\n");
    alert(`Remediation reminders successfully sent to:\n${list}`);
  };

  const handleExportFollowup = () => {
    const element = document.createElement("a");
    const content = `AuditSphere AI - Remediation Follow-up Monitoring Report\n======================================================\nGenerated: ${new Date().toLocaleString()}\n\nTotal Findings: ${findings.length}\nResolved: ${findings.filter(f => f.progress === 100).length}\nPending: ${findings.filter(f => f.progress < 100).length}\n\nList of Findings:\n` + 
      findings.map(f => `- ${f.id} [${f.severity}]: ${f.title} (Owner: ${f.owner}, Progress: ${f.progress}%)`).join("\n");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "FollowUp_Remediation_Report.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const groupedFindingsByBranch = Object.entries(
    findings.reduce((acc, item) => {
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
        title={t("followup.title")}
        subtitle={t("followup.subtitle")}
        actions={[
          { label: t("followup.btnReminder"), variant: "default", onClick: sendReminders },
          { label: t("followup.btnExport"), onClick: handleExportFollowup },
        ]}
      />
      {groupedFindingsByBranch.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("followup.trackerTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-slate-500 py-8">{t("followup.empty")}</div>
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
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white tracking-tight">{actualActiveTab}</h2>
                <Badge tone="slate" className="font-mono">{Object.keys(activeAudits).length} Audits</Badge>
              </div>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
                {(["Active", "Completed", "All"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      statusFilter === status
                        ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
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
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider">{items.length} Action Plans</p>
                    </div>
                  </div>
                  <div className="p-0">
                    <ModuleTable headers={["Finding ID", "Action Plan", "Owner", "Due Date", "Progress", "State", "Actions"]}>
                      {items
                        .filter(item => {
                          if (statusFilter === "All") return true;
                          const isCompleted = item.progress === 100;
                          if (statusFilter === "Completed") return isCompleted;
                          return !isCompleted;
                        })
                        .map((item, idx) => (
                        <tr
                          key={item.id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition"
                        >
                          <TableCell className="font-semibold text-cyan-200">{item.id}</TableCell>
                          <TableCell className="text-white max-w-sm truncate">
                            <span title={item.actionPlan}>{item.actionPlan || "No action plan specified"}</span>
                          </TableCell>
                          <TableCell className="text-slate-300">{item.owner}</TableCell>
                          <TableCell className="text-slate-300 font-mono text-xs">2026-10-{12 + idx}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={item.progress} className="w-16" />
                              <span className="text-xs text-slate-400 font-mono">{item.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              tone={
                                item.progress === 100
                                  ? "emerald"
                                  : item.progress >= 70
                                  ? "cyan"
                                  : item.progress >= 40
                                  ? "amber"
                                  : "red"
                              }
                            >
                              {item.progress === 100
                                ? "Resolved"
                                : item.progress >= 70
                                ? "On Track"
                                : item.progress >= 40
                                ? "Under Watch"
                                : "At Risk"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              className="h-8 text-xs hover:bg-cyan-400/10 hover:text-cyan-200 border-white/10 rounded-lg transition"
                              onClick={() => handleOpenUpdate(item)}
                            >
                              Tindak Lanjut
                            </Button>
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

      {/* Notion-style Mitigation Workspace Modal */}
      {selectedFinding && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedFinding(null)}
          title={`Ruang Kerja Tindak Lanjut: ${selectedFinding.id}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-sm">
            {/* Context Header */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <h3 className="font-semibold text-white text-base mb-1">{selectedFinding.title}</h3>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  Audit: {selectedFinding.auditName || "-"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Batas Waktu: {selectedFinding.dueDate || "N/A"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  Keparahan: {selectedFinding.severity}
                </span>
              </div>
            </div>

            {/* Action Plan Reference */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                Rekomendasi Auditor (Action Plan)
              </label>
              <div className="rounded-lg bg-black/40 p-3 text-slate-300 border border-white/5 leading-relaxed">
                {selectedFinding.actionPlan || "Belum ada rencana tindak lanjut yang disepakati."}
              </div>
            </div>

            {/* Auditee Workspace */}
            <form onSubmit={handleUpdate} className="space-y-5 border-t border-white/10 pt-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                  Tanggapan & Bukti Perbaikan (PIC)
                </label>
                <textarea
                  className="w-full min-h-[100px] rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                  placeholder="Ketikkan langkah-langkah konkret yang telah dilakukan untuk menutup temuan ini..."
                  value={mitigationResponse}
                  onChange={(e) => setMitigationResponse(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Lampiran Bukti (Opsional)
                  </label>
                  <Input type="file" className="text-xs text-slate-400 file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs hover:file:bg-white/20" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Update Progress (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={progressVal}
                      onChange={(e) => setProgressVal(e.target.value)}
                      className="w-20"
                    />
                    <Progress value={parseInt(progressVal) || 0} className="flex-1" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="text-xs text-slate-500">
                  Perubahan akan otomatis tercatat di log audit.
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setSelectedFinding(null)} className="hover:bg-white/5 text-slate-300">
                    Batal
                  </Button>
                  <Button type="submit" className="bg-cyan-500 text-slate-900 hover:bg-cyan-400 font-semibold shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]">
                    Simpan Perbaikan
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
