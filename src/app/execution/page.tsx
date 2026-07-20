"use client";

import { useState } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import type { Finding } from "@/types/audit";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { Bot, Loader2, Building2, LayoutGrid } from "lucide-react";
import Script from "next/script";

export default function ExecutionPage() {
  const { audits, addDocument, addFinding, updateAuditStatus } = useAuditStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Completed" | "All">("Active");

  const handleOpenUpload = (auditId: string) => {
    setSelectedAuditId(auditId);
    setIsOpen(true);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExtracting) return;
    if (!fileObj || !selectedAuditId) return;

    const audit = audits.find((a) => a.id === selectedAuditId);
    if (!audit) return;

    setIsExtracting(true);

    // Simulate AI extraction delay but parse actual file
    setIsExtracting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const XLSX = (window as any).XLSX;
        if (XLSX) {
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // Konversi data tabel menjadi format CSV sederhana untuk dibaca Gemini
          const csvText = rows.map(r => r.join(", ")).join("\n");
          
          try {
            const res = await fetch("/api/extract-findings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ csvText })
            });

            const responseData = await res.json();
            
            if (!res.ok) {
              throw new Error(responseData.error || "Gagal menghubungi Gemini API");
            }

            const extractedFindings = responseData.findings || [];
            
            for (const item of extractedFindings) {
              await addFinding({
                title: item.title || "Unknown Finding",
                description: item.description || "",
                branch: audit.branch,
                category: item.category || "Operasional",
                severity: (["Critical", "High", "Medium", "Low"].includes(item.severity) ? item.severity : "Medium") as Finding["severity"],
                status: "Open",
                owner: item.owner || "Auditee",
                sla: "30 days left",
                risk: 0,
                actionPlan: "",
                auditId: audit.id,
                auditName: audit.name
              });
            }
            
            updateAuditStatus(audit.id, "Review Pending");
            setFileObj(null);
            setFileName("");
            setIsExtracting(false);
            setIsOpen(false);
            setSelectedAuditId(null);
            
            alert(`${t("exec.successMsg")} "${audit.name}"! Gemini AI berhasil memahami laporan dan mengekstrak ${extractedFindings.length} temuan.`);
          } catch (apiError: any) {
            console.error("API Error:", apiError);
            alert("Error dari AI: " + apiError.message);
            setIsExtracting(false);
          }
        }
      };
      reader.readAsArrayBuffer(fileObj);
    } catch (error) {
      console.error(error);
      setIsExtracting(false);
    }
    
    // Add document to store
    addDocument({
      id: Math.random().toString(36).substring(2, 9),
      name: fileObj.name,
      type: "Laporan Hasil Pemeriksaan",
      version: "v1",
      owner: audit.lead,
      modified: "Just now",
    });
  };

  const groupedAudits = Object.entries(
    audits.reduce((acc, audit) => {
      const branchName = audit.branch || "Lainnya";
      if (!acc[branchName]) acc[branchName] = [];
      acc[branchName].push(audit);
      return acc;
    }, {} as Record<string, typeof audits>)
  );

  const branches = groupedAudits.map(([branchName]) => branchName);
  const actualActiveTab = branches.includes(activeTab) ? activeTab : branches[0] || "";
  const activeAudits = groupedAudits.find(([b]) => b === actualActiveTab)?.[1] || [];

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("exec.title")}
        subtitle={t("exec.subtitle")}
      />

      {groupedAudits.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("exec.tableTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-slate-500 py-8">{t("exec.empty")}</div>
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
              <Badge tone="slate" className="font-mono">{activeAudits.length} Audits</Badge>
            </div>
            
            <div className="rounded-2xl border border-white/10 bg-[#0a1120] overflow-hidden shadow-lg">
              <div className="bg-white/[0.02] border-b border-white/5 px-5 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">Daftar Pemeriksaan</h3>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">{activeAudits.length} Items</p>
                </div>
                <div className="ml-auto flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
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
              <div className="p-0 max-h-[500px] overflow-y-auto relative">
                <ModuleTable headers={[t("exec.colName"), t("exec.colPeriod"), t("exec.colDueDate"), t("exec.colStatus"), t("exec.colActions")]}>
                  {activeAudits
                    .filter(a => {
                      if (statusFilter === "All") return true;
                      if (statusFilter === "Completed") return a.status === "Completed" || a.progress === 100;
                      return a.status !== "Completed" && a.progress < 100;
                    })
                    .map((item) => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                      <TableCell>
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-xs text-slate-400">Lead: {item.lead}</div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {item.period || "N/A"}
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono text-sm">
                        {item.dueDate || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge tone={item.status === "Completed" ? "emerald" : item.status === "In Review" ? "amber" : "cyan"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                          onClick={() => handleOpenUpload(item.id)}
                        >
                          {t("exec.btnUpload")}
                        </Button>
                      </TableCell>
                    </tr>
                  ))}
                </ModuleTable>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Upload Evidence Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t("exec.modalTitle")}>
        <form onSubmit={handleUpload} className="space-y-4 text-sm">
          <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4 text-xs text-indigo-200 leading-relaxed mb-4">
            {t("exec.modalSubtitle")}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">{t("exec.chooseFile")}</label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileObj(f);
                  setFileName(f.name);
                }
              }}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isExtracting}>
              {t("exec.btnCancel")}
            </Button>
            <Button type="submit" disabled={isExtracting} className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold min-w-[160px]">
              {isExtracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI Extracting...
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  {t("exec.btnSubmit")}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
      <Script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js" strategy="lazyOnload" />
    </div>
  );
}
