"use client";

import { useState } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function DocumentsPage() {
  const { documents, addDocument, deleteDocument } = useAuditStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState("Evidence Pack");
  const [version, setVersion] = useState("v1");
  const [owner, setOwner] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !owner.trim()) return;

    addDocument({
      name,
      type,
      version,
      owner,
      modified: "Just now",
    });

    // Reset Form
    setName("");
    setType("Evidence Pack");
    setVersion("v1");
    setOwner("");
    setIsOpen(false);
  };

  const handleRetentionInfo = () => {
    alert("Enterprise Document Retention Policy:\n\n- Active Audit Evidence: Retained for 7 years under ISO 27001 compliance standards.\n- Working Papers & Drafts: Archived for 5 years after audit closure.\n- Final Reports: Retained permanently in secure vault storage.\n- Automated Deletion: Purged files are zero-overwritten for privacy assurance.");
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.type.toLowerCase().includes(search.toLowerCase()) ||
    doc.owner.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("docs.title")}
        subtitle={t("docs.subtitle")}
        actions={[
          { label: t("docs.btnUpload"), variant: "default", onClick: () => setIsOpen(true) },
          { label: t("docs.btnRetention"), onClick: handleRetentionInfo },
        ]}
      />
      <Card>
        <CardContent className="flex flex-col gap-2 md:flex-row pt-6">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename, tag, audit ID, or owner..."
            className="flex-1"
          />
          {search && (
            <Button variant="ghost" onClick={() => setSearch("")} className="text-slate-400">
              Clear
            </Button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("docs.tableTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleTable headers={["Document", "Type", "Version", "Owner", "Modified", "Actions"]}>
            {filteredDocs.map((item) => (
              <tr key={item.name} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                <TableCell className="font-medium text-white">{item.name}</TableCell>
                <TableCell className="text-slate-300">{item.type}</TableCell>
                <TableCell className="text-slate-300">{item.version}</TableCell>
                <TableCell className="text-slate-300">{item.owner}</TableCell>
                <TableCell className="text-slate-300">{item.modified}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteDocument(item.name)}
                    className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </tr>
            ))}
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  No documents found matching "{search}"
                </td>
              </tr>
            )}
          </ModuleTable>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Upload Document Artifact">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Document Filename</label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3_Audit_Evidence_Log.xlsx"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Document Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="Evidence Pack">Evidence Pack</option>
                <option value="Data Extract">Data Extract</option>
                <option value="Confidential">Confidential Document</option>
                <option value="Report">Audit Report</option>
                <option value="Policy">Company Policy</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Version</label>
              <Input
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v1, v2"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Uploader / Owner</label>
            <Input
              required
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold">
              {t("docs.btnUpload")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
