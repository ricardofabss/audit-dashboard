"use client";

import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvestigationPage() {
  const { wbsCases, activities } = useAuditStore();
  const caseData = wbsCases.length > 0 ? wbsCases[0] : { id: "No Case", title: "No active cases found", category: "-", reporter: "-" };
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Fraud Investigation Workspace" subtitle="Case management, evidence review, timeline analysis, and decision workflow." actions={[{ label: "Escalate to Legal", variant: "danger" }, { label: "Update Case" }]} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Case Overview: {caseData.id}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-slate-200">{caseData.title}</div>
            <div className="text-xs text-slate-500">{caseData.category} • Reporter {caseData.reporter}</div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
              Relationship map placeholder: visualize people, vendors, bank accounts, and approval chains.
            </div>
            <div className="space-y-2">
              {activities.map((item) => (
                <div key={item.title} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-100">{item.title}</div>
                    <Badge tone={item.tone}>{item.time}</Badge>
                  </div>
                  <div className="text-xs text-slate-400">{item.detail}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Decision Workflow</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">1. Confirm evidence chain integrity</div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">2. Conduct interview round two</div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">3. Prepare legal escalation memo</div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">4. CAE and legal sign-off</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
