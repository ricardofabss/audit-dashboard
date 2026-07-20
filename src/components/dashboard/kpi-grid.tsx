"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

const toneClass = {
  cyan: "text-cyan-200",
  emerald: "text-emerald-200",
  amber: "text-amber-200",
  red: "text-rose-200",
  indigo: "text-indigo-200",
};

export function KPIGrid() {
  const { audits, findings } = useAuditStore();
  const { t } = useTranslation();
  
  const activeAuditsCount = audits.filter((a) => a.status === "In Progress" || a.status === "Fieldwork").length;
  const openFindingsCount = findings.filter((f) => f.status !== "Resolved").length;
  
  // Overdue findings: based on SLA containing "overdue" or zero progress open findings
  const overdueFindingsCount = findings.filter((f) => 
    f.status !== "Resolved" && (f.sla?.toLowerCase().includes("overdue") || f.progress === 0)
  ).length;
  
  // Audit Plan Realization: completed / annual target
  const ANNUAL_AUDIT_TARGET = 30;
  const completedAudits = audits.filter((a) => a.status === "Completed" || a.progress === 100).length;
  const planRealization = Math.round((completedAudits / ANNUAL_AUDIT_TARGET) * 100);

  const executiveMetrics = [
    { 
      label: t("dash.kpiActiveAudits"), 
      value: String(activeAuditsCount), 
      change: `${t("dash.kpiTotal")}: ${audits.length} ${t("dash.kpiPlanned")}`, 
      tone: "cyan" as const,
      up: true,
    },
    { 
      label: t("dash.kpiOpenFindings"), 
      value: String(openFindingsCount), 
      change: `${findings.filter((f) => f.status === "Open").length} ${t("dash.kpiUnassigned")}`, 
      tone: "amber" as const,
      up: false,
    },
    { 
      label: t("dash.kpiOverdueFindings"), 
      value: String(overdueFindingsCount), 
      change: t("dash.kpiNeedFollowUp"), 
      tone: "red" as const,
      up: false,
    },
    { 
      label: t("dash.kpiPlanRealization"), 
      value: `${planRealization}%`, 
      change: `${completedAudits}/${ANNUAL_AUDIT_TARGET} ${t("dash.kpiCompleted")}`, 
      tone: "emerald" as const,
      up: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {executiveMetrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{metric.label}</div>
              <Badge tone={metric.tone}>{metric.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}</Badge>
            </div>
            <div className={`text-3xl font-semibold ${toneClass[metric.tone]}`}>{metric.value}</div>
            <div className="text-xs text-slate-400">{metric.change}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
