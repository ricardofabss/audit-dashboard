"use client";

import { useState } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";

export default function ExecutionPage() {
  const { audits, findings, addDocument } = useAuditStore();
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("Evidence Pack");

  const audit = audits[0] || {
    name: "General Financial Audit",
    branch: "APAC Headquarters",
    lead: "Sarah Jenkins",
    progress: 50,
    risk: "High",
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    addDocument({
      id: Math.random().toString(36).substring(2, 9),
      name: fileName.endsWith(".pdf") || fileName.endsWith(".xlsx") || fileName.endsWith(".zip") 
        ? fileName 
        : `${fileName}.pdf`,
      type: fileType,
      version: "v1",
      owner: audit.lead,
      modified: "Just now",
    });

    setFileName("");
    setIsOpen(false);
    alert("Evidence successfully uploaded and logged in Document Center!");
  };

  const handleReviewSubmit = () => {
    alert(`Success: "${audit.name}" has been submitted for review!\n\nCAE and Lead Auditor (${audit.lead}) have been notified.`);
  };

  const handleGenerateDraftReport = () => {
    const element = document.createElement("a");
    const content = `AuditSphere AI - Draft Audit Report\n==================================\nAudit: ${audit.name}\nBranch: ${audit.branch}\nLead: ${audit.lead}\nStatus: ${audit.status}\nProgress: ${audit.progress}%\nRisk: ${audit.risk}\nGenerated: ${new Date().toLocaleString()}`;
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Draft_Report_${audit.name.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title="Audit Execution Workspace"
        subtitle="Digital working paper, fieldwork tracking, evidence review, and AI assistance."
        actions={[
          { label: "Submit for Review", variant: "default", onClick: handleReviewSubmit },
          { label: "Generate Draft Report", onClick: handleGenerateDraftReport }
        ]}
      />
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-3 pt-6">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Audit Engagement</div>
            <div className="text-lg font-semibold text-white">{audit.name}</div>
            <div className="text-sm text-slate-400">{audit.branch}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Lead Auditor</div>
            <div className="text-sm text-slate-200">{audit.lead}</div>
            <div className="text-xs text-slate-500">Fieldwork Due: 2026-10-15</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-400">Execution Progress</span>
              <span className="text-cyan-200">{audit.progress}%</span>
            </div>
            <Progress value={audit.progress} />
            <Badge tone="amber">{audit.risk} Risk</Badge>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Fieldwork Testing & Findings checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ModuleTable headers={["Control Test", "Severity", "Status", "Owner"]}>
              {findings.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                  <TableCell>
                    <div className="font-medium text-white">{item.title}</div>
                    <div className="text-xs text-slate-500">{item.id}</div>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={item.severity} />
                  </TableCell>
                  <TableCell>
                    <Badge tone="cyan">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{item.owner}</TableCell>
                </tr>
              ))}
            </ModuleTable>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evidence & AI Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              onClick={() => setIsOpen(true)}
              className="rounded-xl border border-dashed border-white/20 bg-black/20 hover:border-cyan-400/40 hover:bg-cyan-900/5 cursor-pointer p-6 text-center text-sm text-slate-400 transition"
            >
              Click here to upload evidence files
            </div>
            <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4 text-xs text-indigo-200 leading-relaxed shadow-sm">
              <div className="font-semibold text-indigo-300 mb-1">AI Copilot Diagnostic:</div>
              AI anomaly scan found duplicate invoice signatures on the procurement register with 87% pattern match. Suggested action: check vendor master file.
            </div>
            <Button className="w-full bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold" onClick={() => setIsOpen(true)}>
              Open Working Paper Uploader
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upload Evidence Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Upload Audit Evidence">
        <form onSubmit={handleUpload} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Evidence File Name</label>
            <Input
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. APAC_Q3_Procurement_Invoices.xlsx"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Evidence Category</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="Evidence Pack">Evidence Pack</option>
              <option value="Data Extract">Data Extract</option>
              <option value="Confidential">Confidential</option>
              <option value="Report">Report</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold">
              Log Evidence File
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
