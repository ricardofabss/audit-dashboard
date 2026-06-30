"use client";

import { useState } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export default function WBSPage() {
  const { wbsCases, addWBSCase } = useAuditStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Procurement Fraud");
  const [reporter, setReporter] = useState("Anonymous");
  const [status, setStatus] = useState("Triage");
  const [score, setScore] = useState("85");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addWBSCase({
      title,
      category,
      reporter,
      status,
      score: parseInt(score, 10) || 85,
    });

    // Reset Form
    setTitle("");
    setCategory("Procurement Fraud");
    setReporter("Anonymous");
    setStatus("Triage");
    setScore("85");
    setIsOpen(false);
  };

  const handleSecurityInfo = () => {
    alert("WBS Security Configuration:\n\n- Cryptographic Anonymization Protocol: Enabled (SHA-256 with dynamic salt)\n- Reporter Identity Shielding: Enforced\n- Access Logging: Restricted to CAE & Special Investigation Unit\n- Database Audits: Real-time tampering detection active");
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("wbs.title")}
        subtitle={t("wbs.subtitle")}
        actions={[
          { label: t("wbs.btnRegister"), variant: "default", onClick: () => setIsOpen(true) },
          { label: t("wbs.btnSecurity"), onClick: handleSecurityInfo },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {wbsCases.map((item) => (
          <Card key={item.id} className="hover:border-cyan-300/20 transition duration-300">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="text-cyan-200 font-semibold tracking-wide">{item.id}</span>
                <Badge
                  tone={
                    item.status === "Resolved"
                      ? "emerald"
                      : item.status === "Triage"
                      ? "indigo"
                      : item.status === "Investigating"
                      ? "amber"
                      : "cyan"
                  }
                >
                  {item.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="font-medium text-slate-100">{item.title}</div>
              <div className="text-xs text-slate-500">
                Category: <span className="text-slate-400 font-medium">{item.category}</span> • Reporter:{" "}
                <span className="text-slate-400 font-medium">{item.reporter}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>AI fraud risk index</span>
                  <span className={item.score >= 85 ? "text-rose-300" : "text-amber-300 font-medium"}>
                    {item.score}
                  </span>
                </div>
                <Progress
                  value={item.score}
                  indicatorClassName={item.score >= 85 ? "bg-rose-400" : "bg-amber-400"}
                />
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                <span>Age: {item.age}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Register Case Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Register Whistleblower Report">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Allegation Description</label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Procurement markup scheme detected in hardware orders"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="Procurement Fraud">Procurement Fraud</option>
                <option value="Ethics & Conflict">Ethics & Conflict</option>
                <option value="Financial Leakage">Financial Leakage</option>
                <option value="Misconduct">Misconduct</option>
                <option value="Information Security">Information Security</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Reporter Identity</label>
              <Input
                required
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                placeholder="e.g. Anonymous, Confidential Staff"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">{t("wbs.intakeStatus")}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0b1224] p-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="Triage">Triage</option>
                <option value="Investigating">Investigating</option>
                <option value="Evidence Review">Evidence Review</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">AI Fraud Risk Score (1-100)</label>
              <Input
                type="number"
                min="1"
                max="100"
                required
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 85"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold">
              {t("wbs.btnRegister")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
