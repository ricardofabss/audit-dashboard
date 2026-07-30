"use client";

import { useState, useMemo } from "react";
import { useAuditStore, DocumentItem } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { Trash2, Eye, Download, UploadCloud, FileText, ShieldAlert, FileSpreadsheet, FileCode, CheckCircle2, Lock } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { businessUnits } from "@/lib/business-units";
import { useAuth } from "@/hooks/use-auth";

export default function DocumentsPage() {
  const { documents, addDocument, deleteDocument } = useAuditStore();
  const { identity } = useAuth();
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [search, setSearch] = useState("");
  const [selectedBuFilter, setSelectedBuFilter] = useState("ALL");
  const [uploading, setUploading] = useState(false);

  // Form states
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("Evidence Pack");
  const [version, setVersion] = useState("v1.0");
  const [buScope, setBuScope] = useState("ALL");

  const isUserAdmin = identity?.roles?.some((r) => r === "ADMIN" || r === "OWNER" || r === "HEAD_AUDIT");
  const userBranchId = identity?.branchId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("version", version);
      formData.append("buScope", buScope);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploading(false);

      if (!res.ok) {
        alert(data.error || "Gagal mengunggah berkas.");
        return;
      }

      await addDocument(data.document);

      // Reset Form
      setFile(null);
      setType("Evidence Pack");
      setVersion("v1.0");
      setBuScope("ALL");
      setIsOpen(false);
    } catch {
      setUploading(false);
      alert("Terjadi kesalahan saat mengunggah berkas.");
    }
  };

  const handleDeleteDocument = async (id: string, name: string, fileUrl?: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus berkas '${name}' secara permanen?`)) return;

    deleteDocument(id);

    try {
      await fetch(`/api/documents?id=${encodeURIComponent(id)}&fileUrl=${encodeURIComponent(fileUrl || "")}`, {
        method: "DELETE",
      });
    } catch {
      // Ignore API delete error
    }
  };

  const handleRetentionInfo = () => {
    alert("Enterprise Document Retention & Security Policy:\n\n- Active Audit Evidence: Retained for 7 years under ISO 27001 compliance standards.\n- Working Papers & Drafts: Archived for 5 years after audit closure.\n- Confidential Vault Documents: Encrypted storage with restricted download permission.\n- Automated Deletion: Purged files are zero-overwritten for privacy assurance.");
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Search Query Filter
      const matchesSearch =
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.type.toLowerCase().includes(search.toLowerCase()) ||
        doc.owner.toLowerCase().includes(search.toLowerCase());

      // 2. BU Scope Filter
      const docScope = doc.buScope || "ALL";
      const matchesBu = selectedBuFilter === "ALL" || docScope === "ALL" || docScope === selectedBuFilter;

      // 3. User Permission Scope Check (Admins see all; BU Officers see only their BU or ALL)
      const hasPermission =
        isUserAdmin ||
        !userBranchId ||
        docScope === "ALL" ||
        docScope === userBranchId;

      return matchesSearch && matchesBu && hasPermission;
    });
  }, [documents, search, selectedBuFilter, isUserAdmin, userBranchId]);

  const getFileIcon = (fileType?: string, fileName?: string) => {
    const name = fileName?.toLowerCase() || "";
    if (name.endsWith(".pdf") || fileType?.includes("pdf")) {
      return <FileText className="h-4 w-4 text-rose-400 shrink-0" />;
    }
    if (name.endsWith(".xlsx") || name.endsWith(".csv") || fileType?.includes("sheet") || fileType?.includes("csv")) {
      return <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />;
    }
    return <FileCode className="h-4 w-4 text-cyan-400 shrink-0" />;
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("docs.title")}
        subtitle="Brankas penyimpanan berkas bukti audit, kertas kerja, dan laporan holding berenkripsi."
        actions={[
          { label: "Upload Berkas Baru", variant: "default", onClick: () => setIsOpen(true) },
          { label: "Kebijakan Retensi Dokumen", onClick: handleRetentionInfo },
        ]}
      />

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="flex flex-col gap-3 md:flex-row pt-6">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berkas berdasarkan nama, tipe, uploader, atau kata kunci..."
            className="flex-1"
          />

          <select
            value={selectedBuFilter}
            onChange={(e) => setSelectedBuFilter(e.target.value)}
            className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          >
            <option value="ALL" className="bg-slate-900 text-slate-100">
              Semua Scope Perusahaan / Holding
            </option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id} className="bg-slate-900 text-slate-100">
                [{bu.code}] {bu.name}
              </option>
            ))}
          </select>

          {search && (
            <Button variant="ghost" onClick={() => setSearch("")} className="text-slate-400">
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vault Berkas Audit & Artifacts</CardTitle>
          <div className="text-xs text-slate-400">
            Total Berkas Terakses: <span className="font-bold text-cyan-300">{filteredDocs.length}</span>
          </div>
        </CardHeader>

        <CardContent>
          <ModuleTable headers={["Nama Berkas Dokumen", "Scope Perusahaan", "Tipe / Kategori", "Versi", "Uploader", "Ukuran", "Aksi & Preview"]}>
            {filteredDocs.map((item, idx) => {
              const buObj = businessUnits.find((b) => b.id === item.buScope);
              const scopeLabel = buObj ? `[${buObj.code}] ${buObj.shortName}` : "Holding Level (All)";

              return (
                <tr key={item.id || `${item.name}-${idx}`} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                  <TableCell>
                    <div className="flex items-center gap-2 font-semibold text-white">
                      {getFileIcon(item.fileType, item.name)}
                      <span className="truncate max-w-[280px]" title={item.name}>{item.name}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 font-mono">
                      {scopeLabel}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-slate-300">{item.type}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-400">{item.version}</TableCell>
                  <TableCell className="text-xs text-slate-300">{item.owner}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-400">{item.fileSize || "1.2 MB"}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Preview Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewDoc(item)}
                        className="h-8 gap-1 text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200"
                        title="Pratinjau Berkas"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="text-xs">Preview</span>
                      </Button>

                      {/* Download Button */}
                      {item.fileUrl ? (
                        <a
                          href={item.fileUrl}
                          download={item.name}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition"
                          title="Unduh Berkas Asli"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Unduh</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                          <Lock className="h-3 w-3" /> Secure Vault
                        </span>
                      )}

                      {/* Delete Physical & DB File Button */}
                      {isUserAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDocument(item.id, item.name, item.fileUrl)}
                          className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition"
                          title="Hapus Dokumen & File Fisik"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </tr>
              );
            })}

            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                  Tidak ada berkas yang cocok dengan filter "{search}"
                </td>
              </tr>
            )}
          </ModuleTable>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Upload Berkas Fisik & Bukti Audit">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Pilih Berkas Dokumen Fisik (.pdf, .xlsx, .docx, .png)</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer border-white/20 bg-black/30 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-cyan-400" />
                  <p className="mb-1 text-xs text-slate-300">
                    <span className="font-semibold text-cyan-300">Klik untuk memilih file</span> atau drag and drop
                  </p>
                  <p className="text-[10px] text-slate-400">PDF, Excel XLSX, Word DOCX, atau Foto Bukti (Max 50MB)</p>
                </div>
                <input
                  type="file"
                  required
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            {file && (
              <div className="mt-2 text-xs text-emerald-300 font-semibold flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
                <span>File terpilih: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Kategori Dokumen</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/40 p-2 text-slate-100 focus:border-cyan-400 focus:outline-none text-xs"
              >
                <option value="Evidence Pack">Evidence Pack (Bukti Audit)</option>
                <option value="Data Extract">Data Extract (Ekstraksi Excel)</option>
                <option value="Confidential">Confidential Document (WBS/Fraud)</option>
                <option value="Audit Report">Audit Report (Laporan Resmi)</option>
                <option value="Company Policy">Company Policy (SOP/Kebijakan)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Scope Perusahaan (Akses)</label>
              <select
                value={buScope}
                onChange={(e) => setBuScope(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/40 p-2 text-slate-100 focus:border-cyan-400 focus:outline-none text-xs"
              >
                <option value="ALL">Seluruh Perusahaan / Holding Level</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    [{bu.code}] {bu.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Versi Berkas</label>
            <Input
              required
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Contoh: v1.0, v2.1"
              className="bg-black/30 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={uploading || !file} className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
              {uploading ? "Mengunggah Berkas..." : "Upload Berkas Ke Vault"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* In-Browser Document Preview Modal */}
      {previewDoc && (
        <Modal isOpen={Boolean(previewDoc)} onClose={() => setPreviewDoc(null)} title={`Pratinjau Dokumen: ${previewDoc.name}`}>
          <div className="space-y-4 text-xs text-slate-300">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 flex justify-between items-center">
              <div>
                <div className="font-bold text-white text-sm">{previewDoc.name}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Uploader: {previewDoc.owner} | Versi: {previewDoc.version}</div>
              </div>
              <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                {previewDoc.type}
              </span>
            </div>

            {/* Document Viewer Frame */}
            {previewDoc.fileUrl ? (
              <div className="w-full h-80 rounded-xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                {previewDoc.name.endsWith(".pdf") ? (
                  <iframe src={previewDoc.fileUrl} className="w-full h-full" title={previewDoc.name} />
                ) : previewDoc.fileType?.includes("image") ? (
                  <img src={previewDoc.fileUrl} alt={previewDoc.name} className="max-h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <FileSpreadsheet className="h-12 w-12 text-emerald-400" />
                    <div className="font-semibold text-white">Pratinjau Berkas {previewDoc.type}</div>
                    <p className="text-slate-400 max-w-sm">
                      Berkas spreadsheet / dokumen ini dilindungi enkripsi vault. Anda dapat mengunduh berkas asli untuk melihat isi lengkap.
                    </p>
                    <a
                      href={previewDoc.fileUrl}
                      download={previewDoc.name}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                    >
                      <Download className="h-4 w-4" /> Unduh Berkas Asli ({previewDoc.fileSize || "1.2 MB"})
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl border border-white/10 bg-black/30">
                <ShieldAlert className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                <div className="font-semibold text-white">Dokumen Vault Terenkripsi</div>
                <p className="text-slate-400 mt-1">
                  Dokumen ini merupakan arsip audit bawaan sistem ISO 27001.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setPreviewDoc(null)} variant="secondary">
                Tutup Pratinjau
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
