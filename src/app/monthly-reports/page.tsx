"use client";

import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export default function MonthlyReportsPage() {
  const { reports } = useAuditStore();
  const { t } = useTranslation();

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={t("nav.monthlyReports") || "Monthly Reports"}
        subtitle="Track monthly report submissions from all branches."
      />

      <div className="space-y-4">
        <Card className="bg-slate-900/50 border-white/5 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Business Unit Submissions</CardTitle>
            <p className="text-sm text-slate-400">Manage incoming granular data from all business units.</p>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <ModuleTable headers={["Report Month", "Business Unit", "Submitter", "Status", "Date", "Action"]}>
                {reports.map((r) => {
                  const isSubmitted = r.status === "Submitted" || r.status === "In Review" || r.status === "Approved";
                  const badgeColor = 
                    r.status === "Approved" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" :
                    isSubmitted ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/20" : 
                    r.status === "Pending" ? "bg-amber-500/20 text-amber-300 border-amber-500/20" : 
                    "bg-rose-500/20 text-rose-300 border-rose-500/20";

                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                      <TableCell className="font-mono">{r.reportMonth}</TableCell>
                      <TableCell>{r.buCode}</TableCell>
                      <TableCell>{r.submitter || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs border ${badgeColor}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10">
                          {isSubmitted ? "Review" : "Remind"}
                        </Button>
                      </TableCell>
                    </tr>
                  );
                })}
              </ModuleTable>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
