"use client";

import { useRouter } from "next/navigation";
import { KPIGrid } from "@/components/dashboard/kpi-grid";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { ActivityStream } from "@/components/dashboard/activity-stream";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/hooks/use-translation";
import { useAuditStore } from "@/hooks/use-audit-store";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { audits, reports } = useAuditStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleExport = () => {
    const element = document.createElement("a");
    const reportContent = `AuditSphere AI - Executive Command Center Report\nGenerated at: ${new Date().toLocaleString()}\n\nActive Audits: 28\nOpen Findings: 146\nCritical Findings: 11\nCompliance Score: 91%`;
    const file = new Blob([reportContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "AuditSphere_Executive_Report.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("dash.title")}
        subtitle={t("dash.subtitle")}
        actions={[
          { label: t("dash.btnCreate"), variant: "default", onClick: () => router.push("/planning?create=true") },
          { label: t("dash.btnExport"), onClick: handleExport },
        ]}
      />
      
      {isMounted && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex gap-4 items-start animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-cyan-500/20 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 animate-pulse"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">Global AI Prescriptive Insight</h3>
            <p className="text-sm text-slate-300 mb-2">Based on current auditor velocity, the 28 active audits will take approximately 12 days to complete. However, historical data suggests a bottleneck in Region B.</p>
            <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded inline-block border border-emerald-500/20">
              Recommended Action: Reallocate 2 auditors from Region A to Region B immediately to maintain SLA.
            </div>
          </div>
        </div>
      )}

      <KPIGrid />
      <OverviewCharts />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityStream />
        </div>
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("dash.completionProgress")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[150px] overflow-y-auto pr-2">
            {!isMounted ? (
              <div className="space-y-3">
                <div className="h-10 w-full animate-pulse bg-slate-800/50 rounded-lg"></div>
                <div className="h-10 w-full animate-pulse bg-slate-800/50 rounded-lg"></div>
              </div>
            ) : audits.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">No active audits found</div>
            ) : (
              audits.slice(0, 4).map((item) => {
                const tone = item.progress >= 75 ? "bg-emerald-400" : item.progress >= 40 ? "bg-cyan-400" : "bg-amber-400";
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate pr-2">{item.name}</span>
                      <span className="text-slate-400 font-mono">{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} indicatorClassName={tone} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Monthly Report Compliance Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Report Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[150px] overflow-y-auto pr-2">
            {!isMounted ? (
              <div className="space-y-3">
                <div className="h-8 w-full animate-pulse bg-slate-800/50 rounded-lg"></div>
                <div className="h-8 w-full animate-pulse bg-slate-800/50 rounded-lg"></div>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">No reports tracked</div>
            ) : (
              reports.slice(0, 5).map((rep) => {
                const isSubmitted = rep.status === "Submitted" || rep.status === "In Review";
                const isPending = rep.status === "Pending";
                const badgeColor = isSubmitted ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" : isPending ? "bg-amber-500/20 text-amber-300 border-amber-500/20" : "bg-rose-500/20 text-rose-300 border-rose-500/20";
                
                return (
                  <div key={rep.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 font-mono text-xs">{rep.buCode}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${badgeColor}`}>
                      {rep.status}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
