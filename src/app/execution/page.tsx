"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import type { Finding, Audit } from "@/types/audit";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { 
  Bot, 
  Loader2, 
  Building2, 
  LayoutGrid, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  FileCheck, 
  UploadCloud, 
  Search, 
  FileSpreadsheet, 
  UserCheck, 
  Calendar, 
  Eye, 
  Sparkles,
  Layers,
  TrendingUp,
  AlertCircle,
  Pencil,
  Trash2,
  MoreVertical,
  ChevronDown,
  AlertTriangle
} from "lucide-react";
import Script from "next/script";

export default function ExecutionPage() {
  const { audits, findings, addDocument, addFinding, updateAuditStatus, deleteAudit, updateAudit } = useAuditStore();
  const { t } = useTranslation();
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Review Pending" | "Completed">("Active");
  const [searchTerm, setSearchTerm] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  
  // Modals
  const [detailAudit, setDetailAudit] = useState<Audit | null>(null);
  const [editAudit, setEditAudit] = useState<Audit | null>(null);
  const [deleteConfirmAudit, setDeleteConfirmAudit] = useState<Audit | null>(null);

  // Form State for Edit Modal
  const [editForm, setEditForm] = useState({
    name: "",
    branch: "",
    lead: "",
    period: "",
    dueDate: "",
    status: "",
    progress: 0,
  });

  // Action Dropdown List Down state
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Group audits by business unit / branch
  const groupedAudits = useMemo(() => {
    return Object.entries(
      audits.reduce((acc, audit) => {
        const branchName = audit.branch || "Lainnya";
        if (!acc[branchName]) acc[branchName] = [];
        acc[branchName].push(audit);
        return acc;
      }, {} as Record<string, typeof audits>)
    );
  }, [audits]);

  const branches = useMemo(() => groupedAudits.map(([branchName]) => branchName), [groupedAudits]);

  // Filtered branches by search input
  const filteredBranches = useMemo(() => {
    if (!unitSearch.trim()) return branches;
    return branches.filter((b) => b.toLowerCase().includes(unitSearch.toLowerCase()));
  }, [branches, unitSearch]);

  const actualActiveTab = branches.includes(activeTab) ? activeTab : branches[0] || "";
  const activeAudits = useMemo(() => {
    return groupedAudits.find(([b]) => b === actualActiveTab)?.[1] || [];
  }, [groupedAudits, actualActiveTab]);

  // Overall KPI statistics
  const kpiStats = useMemo(() => {
    const total = audits.length;
    const active = audits.filter((a) => a.status !== "Completed" && a.progress < 100 && a.status !== "Review Pending").length;
    const reviewPending = audits.filter((a) => a.status === "Review Pending" || a.status === "In Review").length;
    const completed = audits.filter((a) => a.status === "Completed" || a.progress === 100).length;
    const avgProgress = total > 0 ? Math.round(audits.reduce((acc, a) => acc + (a.progress || 0), 0) / total) : 0;
    return { total, active, reviewPending, completed, avgProgress };
  }, [audits]);

  // Filtered audits for the selected branch table
  const filteredAudits = useMemo(() => {
    return activeAudits.filter((item) => {
      // Status filter
      if (statusFilter === "Active") {
        if (item.status === "Completed" || item.progress === 100 || item.status === "Review Pending") return false;
      } else if (statusFilter === "Review Pending") {
        if (item.status !== "Review Pending" && item.status !== "In Review") return false;
      } else if (statusFilter === "Completed") {
        if (item.status !== "Completed" && item.progress !== 100) return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(query);
        const matchesLead = item.lead?.toLowerCase().includes(query);
        const matchesScope = item.scope?.toLowerCase().includes(query);
        return matchesName || matchesLead || matchesScope;
      }

      return true;
    });
  }, [activeAudits, statusFilter, searchTerm]);

  // Handlers
  const handleOpenUpload = (auditId: string) => {
    setSelectedAuditId(auditId);
    setFileObj(null);
    setFileName("");
    setIsOpen(true);
    setOpenActionMenuId(null);
  };

  const handleOpenEdit = (audit: Audit) => {
    setEditAudit(audit);
    setEditForm({
      name: audit.name || "",
      branch: audit.branch || "",
      lead: audit.lead || "",
      period: audit.period || "",
      dueDate: audit.dueDate || "",
      status: audit.status || "In Progress",
      progress: audit.progress || 0,
    });
    setOpenActionMenuId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAudit) return;
    await updateAudit(editAudit.id, editForm);
    setEditAudit(null);
  };

  const handleDeleteAudit = async () => {
    if (!deleteConfirmAudit) return;
    await deleteAudit(deleteConfirmAudit.id);
    setDeleteConfirmAudit(null);
    setOpenActionMenuId(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExtracting) return;
    if (!fileObj || !selectedAuditId) return;

    const audit = audits.find((a) => a.id === selectedAuditId);
    if (!audit) return;

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
          
          const csvText = rows.map((r) => r.join(", ")).join("\n");
          
          try {
            const res = await fetch("/api/extract-findings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ csvText }),
            });

            const responseData = await res.json();
            
            if (!res.ok) {
              throw new Error(responseData.error || "Gagal menghubungi AI Extraction API");
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
                auditName: audit.name,
              });
            }
            
            updateAuditStatus(audit.id, "Review Pending");
            setFileObj(null);
            setFileName("");
            setIsExtracting(false);
            setIsOpen(false);
            setSelectedAuditId(null);
            
            alert(`${t("exec.successMsg")} "${audit.name}"! Gemini AI berhasil mengekstrak ${extractedFindings.length} temuan audit.`);
          } catch (apiError: any) {
            console.error("API Error:", apiError);
            alert("Error AI: " + apiError.message);
            setIsExtracting(false);
          }
        }
      };
      reader.readAsArrayBuffer(fileObj);
    } catch (error) {
      console.error(error);
      setIsExtracting(false);
    }

    addDocument({
      id: Math.random().toString(36).substring(2, 9),
      name: fileObj.name,
      type: "Laporan Hasil Pemeriksaan (LHP)",
      version: "v1.0",
      owner: audit.lead,
      modified: "Just now",
    });
  };

  const selectedAudit = audits.find((a) => a.id === selectedAuditId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title={t("exec.title")}
        subtitle={t("exec.subtitle")}
      />

      {/* KPI Stats Overview Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 border border-white/10 bg-slate-900/40">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t("exec.totalExecutions")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">{kpiStats.total}</span>
              <span className="text-xs text-slate-400">Unit Audits</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 flex items-center gap-3 border border-white/10 bg-slate-900/40">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t("exec.activeFieldwork")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-300 tracking-tight">{kpiStats.active}</span>
              <span className="text-xs text-blue-400/80">In Fieldwork</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 flex items-center gap-3 border border-white/10 bg-slate-900/40">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t("exec.reviewPending")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-300 tracking-tight">{kpiStats.reviewPending}</span>
              <span className="text-xs text-amber-400/80">Need Review</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 flex items-center gap-3 border border-white/10 bg-slate-900/40">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t("exec.completedAudits")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-300 tracking-tight">{kpiStats.completed}</span>
              <span className="text-xs text-emerald-400/80">Finished</span>
            </div>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 glass-card rounded-xl p-4 flex items-center gap-3 border border-white/10 bg-slate-900/40">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t("exec.avgProgress")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-300 tracking-tight">{kpiStats.avgProgress}%</span>
            </div>
            <Progress value={kpiStats.avgProgress} className="h-1.5 mt-1" indicatorClassName="bg-indigo-400" />
          </div>
        </div>
      </div>

      {groupedAudits.length === 0 ? (
        <Card className="border border-white/10 bg-[#0a1120]">
          <CardHeader>
            <CardTitle>{t("exec.tableTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
              <Briefcase className="w-10 h-10 text-slate-600" />
              <p>{t("exec.empty")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Left Sidebar for Business Units */}
          <div className="md:col-span-1 space-y-4">
            <div className="glass-card rounded-2xl border border-white/10 bg-[#0a1120]/80 p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    Business Units
                  </span>
                </div>
                <Badge tone="cyan" className="font-mono text-[10px]">{branches.length}</Badge>
              </div>

              {/* Unit Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder={t("exec.searchUnitPlaceholder")}
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
                />
              </div>

              {/* Branch Buttons List */}
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredBranches.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4">Unit tidak ditemukan</div>
                ) : (
                  filteredBranches.map((branch) => {
                    const branchAuditsCount = audits.filter((a) => (a.branch || "Lainnya") === branch).length;
                    const isSelected = actualActiveTab === branch;
                    return (
                      <button
                        key={branch}
                        onClick={() => {
                          setActiveTab(branch);
                          setOpenActionMenuId(null);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left group ${
                          isSelected
                            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)] font-medium"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Building2 className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                          <span className="truncate text-xs font-medium">{branch}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 transition-colors ${
                          isSelected ? "bg-cyan-400/20 text-cyan-300 font-semibold" : "bg-white/5 text-slate-500"
                        }`}>
                          {branchAuditsCount}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selected Unit Quick Summary Card */}
              {actualActiveTab && (
                <div className="pt-3 border-t border-white/10 text-xs space-y-2 bg-white/[0.01] -mx-4 -mb-4 p-4 rounded-b-2xl">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Active Fieldwork:</span>
                    <span className="font-semibold text-white">
                      {activeAudits.filter(a => a.status !== "Completed" && a.progress < 100).length} audit
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Avg Unit Progress:</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {activeAudits.length > 0 
                        ? Math.round(activeAudits.reduce((acc, a) => acc + (a.progress || 0), 0) / activeAudits.length) 
                        : 0}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Main Content Panel */}
          <div className="md:col-span-3 space-y-4 animate-in fade-in duration-300">
            {/* Header & Controls Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0a1120] shadow-xl">
              {/* Unit Title Header */}
              <div className="bg-gradient-to-r from-slate-900/90 via-[#0e172a] to-slate-900/90 border-b border-white/10 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 border border-cyan-500/25 shadow-inner">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      {actualActiveTab}
                    </h2>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      Operational Audit & Fieldwork Assignments
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="cyan" className="font-mono text-xs px-3 py-1">
                    {activeAudits.length} Audits Registered
                  </Badge>
                </div>
              </div>

              {/* Toolbar & Filter Options */}
              <div className="bg-white/[0.02] border-b border-white/5 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t("exec.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
                  />
                </div>

                {/* Status Pills */}
                <div className="flex items-center bg-slate-950/80 border border-white/10 rounded-xl p-1 gap-1">
                  {(["Active", "Review Pending", "Completed", "All"] as const).map((status) => {
                    const count = activeAudits.filter((a) => {
                      if (status === "All") return true;
                      if (status === "Active") return a.status !== "Completed" && a.progress < 100 && a.status !== "Review Pending";
                      if (status === "Review Pending") return a.status === "Review Pending" || a.status === "In Review";
                      if (status === "Completed") return a.status === "Completed" || a.progress === 100;
                      return true;
                    }).length;

                    return (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setOpenActionMenuId(null);
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                          statusFilter === status
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <span>{status}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          statusFilter === status ? "bg-cyan-400/20 text-cyan-300" : "bg-white/5 text-slate-500"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audit Table */}
              <div className="p-0 overflow-x-visible relative">
                {filteredAudits.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-sm">{t("exec.empty")}</p>
                    <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter status audit.</p>
                  </div>
                ) : (
                  <ModuleTable headers={[
                    t("exec.colName"), 
                    t("exec.colPeriod"), 
                    t("exec.colDueDate"), 
                    t("exec.colProgress"), 
                    t("exec.colStatus"), 
                    t("exec.colActions")
                  ]}>
                    {filteredAudits.map((item) => {
                      const isCompleted = item.status === "Completed" || item.progress === 100;
                      const isPending = item.status === "Review Pending" || item.status === "In Review";
                      const isMenuOpen = openActionMenuId === item.id;

                      return (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                          {/* Audit Name & Scope */}
                          <TableCell className="max-w-[240px]">
                            <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors text-sm truncate">
                              {item.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <UserCheck className="w-3 h-3 text-cyan-400" />
                                {item.lead || "Unassigned"}
                              </span>
                              {item.scope && (
                                <span className="text-[10px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[100px]">
                                  {item.scope}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Period */}
                          <TableCell className="text-slate-300">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{item.period || "N/A"}</span>
                            </div>
                          </TableCell>

                          {/* Due Date */}
                          <TableCell className="text-slate-300">
                            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                              <span>{item.dueDate || "N/A"}</span>
                            </div>
                          </TableCell>

                          {/* Fieldwork Progress */}
                          <TableCell className="w-[160px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 text-[11px]">Completion</span>
                                <span className="font-mono text-cyan-300 font-semibold text-xs">{item.progress || 0}%</span>
                              </div>
                              <Progress 
                                value={item.progress || 0} 
                                className="h-2"
                                indicatorClassName={
                                  isCompleted 
                                    ? "bg-emerald-400" 
                                    : (item.progress || 0) >= 60 
                                    ? "bg-cyan-400" 
                                    : "bg-amber-400"
                                } 
                              />
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge tone={isCompleted ? "emerald" : isPending ? "amber" : "cyan"}>
                              {item.status}
                            </Badge>
                          </TableCell>

                          {/* Single Unified Actions Column with Dropdown Menu */}
                          <TableCell className="relative whitespace-nowrap">
                            <div className="relative inline-block text-left" ref={isMenuOpen ? menuRef : null}>
                              <button
                                type="button"
                                onClick={() => setOpenActionMenuId(isMenuOpen ? null : item.id)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm ${
                                  isMenuOpen 
                                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 ring-1 ring-cyan-500/30" 
                                    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50"
                                }`}
                              >
                                <span>Aksi</span>
                                <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`} />
                              </button>

                              {/* List Down Dropdown Menu */}
                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-white/15 bg-[#0e172a] shadow-2xl z-50 p-1.5 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenUpload(item.id)}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/15 rounded-lg transition-colors flex items-center gap-2.5"
                                  >
                                    <UploadCloud className="w-4 h-4 text-cyan-400 shrink-0" />
                                    <span>Upload LHP Excel</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDetailAudit(item);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2.5"
                                  >
                                    <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>Detail Pemeriksaan</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(item)}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/15 rounded-lg transition-colors flex items-center gap-2.5"
                                  >
                                    <Pencil className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span>Edit Audit</span>
                                  </button>

                                  <div className="border-t border-white/10 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteConfirmAudit(item);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors flex items-center gap-2.5"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                                    <span>Hapus Pemeriksaan</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </tr>
                      );
                    })}
                  </ModuleTable>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {detailAudit && (
        <Modal 
          isOpen={!!detailAudit} 
          onClose={() => setDetailAudit(null)} 
          title={`${t("exec.detailModalTitle")} - ${detailAudit.name}`}
        >
          <div className="space-y-5 text-sm">
            {/* Header info card */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 block uppercase font-medium">Business Unit</span>
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  {detailAudit.branch || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block uppercase font-medium">Ketua Tim / Lead</span>
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  {detailAudit.lead || "Unassigned"}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block uppercase font-medium">Periode Examination</span>
                <span className="text-sm font-mono text-slate-300 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {detailAudit.period || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block uppercase font-medium">Batas Waktu (Due Date)</span>
                <span className="text-sm font-mono text-slate-300 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  {detailAudit.dueDate || "N/A"}
                </span>
              </div>
            </div>

            {/* Fieldwork Progress Section */}
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Fieldwork Realization Progress</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">{detailAudit.progress || 0}%</span>
              </div>
              <Progress value={detailAudit.progress || 0} className="h-2.5" indicatorClassName="bg-cyan-400" />
              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                <span>Status: <strong className="text-cyan-300">{detailAudit.status}</strong></span>
                <span>Audit ID: <code className="font-mono">{detailAudit.id}</code></span>
              </div>
            </div>

            {/* Extracted Findings List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Temuan Audit Terkait ({findings.filter(f => f.auditId === detailAudit.id).length})
              </h4>
              {findings.filter(f => f.auditId === detailAudit.id).length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 bg-white/5 rounded-lg border border-white/5 text-center">
                  Belum ada temuan yang diekstrak untuk penugasan audit ini. Unggah LHP (.xlsx) untuk mengekstrak temuan otomatis.
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {findings.filter(f => f.auditId === detailAudit.id).map(f => (
                    <div key={f.id} className="p-3 rounded-lg bg-slate-900/80 border border-white/10 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{f.title}</div>
                        <div className="text-slate-400 mt-0.5 line-clamp-1">{f.description}</div>
                      </div>
                      <Badge tone={f.severity === "Critical" ? "red" : f.severity === "High" ? "amber" : "cyan"}>
                        {f.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button 
                variant="outline" 
                onClick={() => setDetailAudit(null)}
              >
                Tutup
              </Button>
              <Button 
                className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold"
                onClick={() => {
                  const id = detailAudit.id;
                  setDetailAudit(null);
                  handleOpenUpload(id);
                }}
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                Upload LHP Excel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Audit Modal */}
      {editAudit && (
        <Modal 
          isOpen={!!editAudit} 
          onClose={() => setEditAudit(null)} 
          title={t("exec.editModalTitle")}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Nama Penugasan Audit</label>
              <Input 
                value={editForm.name} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Business Unit / Cabang</label>
                <Input 
                  value={editForm.branch} 
                  onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                  required 
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Ketua Tim (Lead Auditor)</label>
                <Input 
                  value={editForm.lead} 
                  onChange={(e) => setEditForm({ ...editForm, lead: e.target.value })}
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Periode Pemeriksaan</label>
                <Input 
                  value={editForm.period} 
                  onChange={(e) => setEditForm({ ...editForm, period: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Batas Waktu (Due Date)</label>
                <Input 
                  value={editForm.dueDate} 
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Status Audit</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review Pending">Review Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Progres Fieldwork (%)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editForm.progress}
                    onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="font-mono text-cyan-300 font-bold text-xs w-10 text-right">{editForm.progress}%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button type="button" variant="outline" onClick={() => setEditAudit(null)}>
                Batal
              </Button>
              <Button type="submit" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold">
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmAudit && (
        <Modal 
          isOpen={!!deleteConfirmAudit} 
          onClose={() => setDeleteConfirmAudit(null)} 
          title={t("exec.deleteConfirmTitle")}
        >
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Konfirmasi Hapus Penugasan</p>
                <p className="text-xs text-slate-300 mt-1">{t("exec.deleteConfirmMsg")}</p>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/10 text-xs space-y-1">
              <div><span className="text-slate-400">Nama Audit:</span> <strong className="text-white">{deleteConfirmAudit.name}</strong></div>
              <div><span className="text-slate-400">Business Unit:</span> <span className="text-slate-300">{deleteConfirmAudit.branch}</span></div>
              <div><span className="text-slate-400">Lead Auditor:</span> <span className="text-slate-300">{deleteConfirmAudit.lead}</span></div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="outline" onClick={() => setDeleteConfirmAudit(null)}>
                Batal
              </Button>
              <Button 
                variant="danger"
                onClick={handleDeleteAudit}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus Audit
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Evidence Modal with AI Extraction */}
      <Modal isOpen={isOpen} onClose={() => !isExtracting && setIsOpen(false)} title={t("exec.modalTitle")}>
        <form onSubmit={handleUpload} className="space-y-4 text-sm">
          {selectedAudit && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Penugasan Audit:</span>
                <span className="font-bold text-cyan-300 text-sm">{selectedAudit.name}</span>
              </div>
              <Badge tone="cyan" className="font-mono">{selectedAudit.branch}</Badge>
            </div>
          )}

          <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3.5 text-xs text-indigo-200 leading-relaxed flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-300 mb-0.5">Integrasi Ekstraksi AI Gemini</p>
              <p className="text-slate-300 text-[11px]">{t("exec.modalSubtitle")}</p>
            </div>
          </div>

          {/* Drag & Drop File Upload Box */}
          <div 
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
              isDragOver
                ? "border-cyan-400 bg-cyan-500/10"
                : fileObj
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-white/15 bg-slate-950/50 hover:border-cyan-500/40 hover:bg-white/[0.02]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) {
                setFileObj(f);
                setFileName(f.name);
              }
            }}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileObj(f);
                  setFileName(f.name);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isExtracting}
            />

            {fileObj ? (
              <div className="space-y-2 py-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/25">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="font-semibold text-emerald-300 text-sm">{fileObj.name}</div>
                <div className="text-xs text-slate-400 font-mono">
                  {(fileObj.size / 1024).toFixed(1)} KB • Terdeteksi Berkas Excel
                </div>
                <span className="inline-block text-[11px] text-cyan-400 underline pt-1">
                  Klik untuk mengganti berkas
                </span>
              </div>
            ) : (
              <div className="space-y-2 py-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/25">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="font-medium text-slate-200">
                  Seret & lepas berkas LHP (.xlsx, .xls) di sini
                </div>
                <p className="text-xs text-slate-400">
                  atau <span className="text-cyan-400 font-semibold underline">pilih dari komputer Anda</span>
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              disabled={isExtracting}
            >
              {t("exec.btnCancel")}
            </Button>
            <Button 
              type="submit" 
              disabled={isExtracting || !fileObj} 
              className="bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-bold min-w-[180px] shadow-lg shadow-cyan-500/20"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                  Mengekstrak AI...
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
