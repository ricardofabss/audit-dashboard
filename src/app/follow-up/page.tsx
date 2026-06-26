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

export default function FollowUpPage() {
  const { findings, updateFindingProgress } = useAuditStore();
  const { t } = useTranslation();
  const [selectedFinding, setSelectedFinding] = useState<{ id: string; title: string; progress: number } | null>(null);
  const [progressVal, setProgressVal] = useState("0");

  const handleOpenUpdate = (id: string, title: string, currentProgress: number) => {
    setSelectedFinding({ id, title, progress: currentProgress });
    setProgressVal(String(currentProgress));
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
      <Card>
        <CardHeader>
          <CardTitle>{t("followup.trackerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleTable headers={["Finding ID", "Action Plan", "Owner", "Due Date", "Progress", "State", "Actions"]}>
            {findings.map((item, idx) => (
              <tr
                key={item.id}
                className="border-b border-white/5 hover:bg-white/[0.02] transition"
              >
                <TableCell className="font-semibold text-cyan-200">{item.id}</TableCell>
                <TableCell className="text-white max-w-sm truncate">
                  <span title={item.title}>Remediation: {item.title}</span>
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
                    onClick={() => handleOpenUpdate(item.id, item.title, item.progress)}
                  >
                    Update Progress
                  </Button>
                </TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>

      {/* Update Progress Modal */}
      {selectedFinding && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedFinding(null)}
          title={`Update Remediation: ${selectedFinding.id}`}
        >
          <form onSubmit={handleUpdate} className="space-y-4 text-sm">
            <div>
              <div className="text-slate-300 mb-2 font-medium">"{selectedFinding.title}"</div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Remediation Progress Percentage (0 - 100)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                required
                value={progressVal}
                onChange={(e) => setProgressVal(e.target.value)}
                placeholder="e.g. 75"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSelectedFinding(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold">
                Save Progress
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
