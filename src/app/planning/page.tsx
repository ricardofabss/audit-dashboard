"use client";

import { useState, useEffect } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { businessUnits } from "@/lib/business-units";
import { TaskOrderGenerator } from "@/modules/approvals/task-order-generator";

export default function PlanningPage() {
  const { audits } = useAuditStore();
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("create=true")) {
      setIsCreating(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("create");
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  const handleScrollToCalendar = () => {
    const element = document.getElementById("calendar-card");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getAuditMonths = (period: string) => {
    const months = new Set<number>();
    const matches = period.match(/\d{2}\/(\d{2})\/\d{4}/g);
    if (matches) {
      matches.forEach(m => {
        const parts = m.split("/");
        if (parts.length === 3) {
          const monthIndex = parseInt(parts[1], 10) - 1;
          if (monthIndex >= 0 && monthIndex <= 11) {
            months.add(monthIndex);
          }
        }
      });
    }
    return Array.from(months);
  };

  const auditsByMonth: Record<number, typeof audits> = {};
  audits.forEach(audit => {
    const months = getAuditMonths(audit.period || "");
    months.forEach(m => {
      if (!auditsByMonth[m]) auditsByMonth[m] = [];
      auditsByMonth[m].push(audit);
    });
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (isCreating) {
    return (
      <div className="space-y-4 pb-10">
        <PageHeader
          title={t("plan.createTitle")}
          subtitle={t("plan.createSubtitle")}
          actions={[{ label: t("plan.btnBack"), variant: "outline", onClick: () => setIsCreating(false) }]}
        />
        <TaskOrderGenerator />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("plan.title")}
        subtitle={t("plan.subtitle")}
        actions={[
          { label: t("plan.btnCreate"), variant: "default", onClick: () => setIsCreating(true) },
          { label: t("plan.btnCalendar"), onClick: handleScrollToCalendar },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card id="calendar-card" className="xl:col-span-2 scroll-mt-6 flex flex-col">
          <CardHeader>
            <CardTitle>{t("plan.calendarTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs h-full">
              {monthNames.map((monthName, idx) => {
                const monthAudits = auditsByMonth[idx] || [];
                const isActive = monthAudits.length > 0;
                
                return (
                  <div
                    key={monthName}
                    className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${
                      isActive 
                        ? "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                        : "border-white/5 bg-white/[0.02] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className={`font-semibold ${isActive ? "text-cyan-400" : "text-slate-500"}`}>
                      {monthName}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      {isActive ? (
                        monthAudits.slice(0, 2).map(a => (
                          <div key={a.id} className="text-[10px] text-slate-300 truncate" title={a.name}>
                            • {a.name}
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-600 italic">No schedules</div>
                      )}
                      
                      {monthAudits.length > 2 && (
                        <div className="text-[10px] text-cyan-500 font-medium mt-1">
                          +{monthAudits.length - 2} more
                        </div>
                      )}
                    </div>
                    
                    {isActive && (
                      <div className="mt-1">
                        <Badge tone="cyan">{monthAudits.length} Audits</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{t("plan.riskMatrix")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-5 gap-1 flex-1 items-center">
            {Array.from({ length: 25 }).map((_, idx) => {
              const val = idx + 1;
              const tone =
                val > 18 ? "bg-rose-400/25" : val > 10 ? "bg-amber-300/20" : "bg-emerald-300/20";
              return <div key={val} className={`aspect-square rounded-md border border-white/10 ${tone}`} />;
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("plan.plannedAudits")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleTable headers={[t("plan.colAudit"), t("plan.colBranch"), t("plan.colLead"), t("plan.colPeriod"), t("plan.colStatus"), t("plan.colProgress")]}>
            {audits.map((audit) => (
              <tr key={audit.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                <TableCell>
                  <div className="font-medium text-white">{audit.name}</div>
                  <div className="text-xs text-slate-500">{audit.id}</div>
                </TableCell>
                <TableCell className="text-slate-300">{audit.branch}</TableCell>
                <TableCell className="text-slate-300">{audit.lead}</TableCell>
                <TableCell className="text-slate-400 text-[11px] whitespace-nowrap">{audit.period || "-"}</TableCell>
                <TableCell>
                  <Badge tone={audit.status === "In Progress" || audit.status === "Fieldwork" ? "cyan" : "indigo"}>
                    {audit.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-300">{audit.progress}%</TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>
    </div>
  );
}
