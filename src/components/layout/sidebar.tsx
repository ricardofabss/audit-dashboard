"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navGroups, productIcon as ProductIcon } from "./navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { useActiveBU } from "@/hooks/use-business-unit";
import { getRiskData } from "@/lib/risk-mock-data";

const navTranslationKeys: Record<string, string> = {
  "Command Center": "nav.commandCenter",
  "Reporting": "nav.reporting",
  "Anomaly Intelligence": "nav.anomalyIntelligence",
  "Intelligence": "nav.intelligence",
  "Workspace": "nav.workspace",
  "Dashboard": "nav.dashboard",
  "Audit Planning": "nav.planning",
  "Audit Execution": "nav.execution",
  "Findings": "nav.findings",
  "Follow-up Monitoring": "nav.followup",
  "Risk Dashboard": "nav.riskDashboard",
  "Anomaly Monitor": "nav.anomalyMonitor",
  "Customer Risk": "nav.customerRisk",
  "Branch Risk": "nav.branchRisk",
  "Officer Risk": "nav.officerRisk",
  "Risk Trends": "nav.riskTrends",
  "WBS": "nav.wbs",
  "Investigation": "nav.investigation",
  "Risk Management": "nav.risk",
  "Compliance": "nav.compliance",
  "Approval Workflow": "nav.approvals",
  "Document Center": "nav.documents",
  "AI Forecasting": "nav.ai",
  "Notifications": "nav.notifications",
  "User Management": "nav.users",
  "Settings": "nav.settings",
  "Monthly Reports": "nav.monthlyReports",
  "Report Dashboard": "nav.reportDashboard",
};

export function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { identity } = useAuth();
  const { t } = useTranslation();
  const permissions = identity?.permissions ?? [];
  const roles = identity?.roles ?? [];
  const hasBypassRole = roles.includes("OWNER") || roles.includes("ADMIN");
  const activeBU = useActiveBU();

  // ── Collapse state for ALL groups ─────────────────────────────────
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const isGroupExpanded = useCallback((label: string) => {
    return !collapsedGroups[label];
  }, [collapsedGroups]);

  // ── Live risk counters (Anomaly Intelligence specific) ────────────
  const riskCounters = useMemo(() => {
    const buId = activeBU ? activeBU.id : null;
    const data = getRiskData(buId);

    const activeAnomalies = data.anomalyDetections.filter(
      (a) => a.status === "DETECTED" || a.status === "CONFIRMED" || a.status === "INVESTIGATING"
    ).length;

    const criticalCustomers = data.customerRiskProfiles.filter(
      (c) => c.riskLevel === "CRITICAL"
    ).length;

    const highRiskBranches = data.branchRiskProfiles.filter(
      (b) => b.riskLevel === "CRITICAL" || b.riskLevel === "HIGH"
    ).length;

    const highRiskOfficers = data.officerRiskProfiles.filter(
      (o) => o.riskLevel === "CRITICAL" || o.riskLevel === "HIGH"
    ).length;

    const unreadInsights = data.riskInsights.filter((i) => !i.isRead).length;

    return {
      anomalies: activeAnomalies,
      customers: criticalCustomers,
      branches: highRiskBranches,
      officers: highRiskOfficers,
      insights: unreadInsights,
      totalAlerts: activeAnomalies + criticalCustomers,
    };
  }, [activeBU]);

  const getBadgeForHref = (href: string): { count: number; color: string } | null => {
    switch (href) {
      case "/risk-intelligence/anomalies":
        return riskCounters.anomalies > 0
          ? { count: riskCounters.anomalies, color: "bg-rose-500" }
          : null;
      case "/risk-intelligence/customers":
        return riskCounters.customers > 0
          ? { count: riskCounters.customers, color: "bg-amber-500" }
          : null;
      case "/risk-intelligence/branches":
        return riskCounters.branches > 0
          ? { count: riskCounters.branches, color: "bg-orange-500" }
          : null;
      case "/risk-intelligence/officers":
        return riskCounters.officers > 0
          ? { count: riskCounters.officers, color: "bg-violet-500" }
          : null;
      default:
        return null;
    }
  };

  // ── Count visible items per group (for collapsed counter) ─────────
  const getGroupItemCount = (group: typeof navGroups[0]): number => {
    return group.items.filter((item) => {
      if (item.permission && !hasBypassRole && !permissions.includes(item.permission)) return false;
      return true;
    }).length;
  };

  return (
    <motion.aside
      animate={{ width: open ? 280 : 76 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="relative hidden shrink-0 border-r border-white/10 bg-[#050b1a]/95 md:flex md:flex-col"
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <ProductIcon className="h-5 w-5" />
        </div>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <div className="text-sm font-semibold tracking-wide text-white">AuditSphere AI</div>
              <div className="text-xs text-slate-500">Enterprise Assurance</div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => {
          const translatedGroup = t((navTranslationKeys[group.label] || group.label) as any);
          const isAnomalyIntelGroup = group.label === "Anomaly Intelligence";
          const groupAccentColor = (isAnomalyIntelGroup && activeBU) ? activeBU.color : "#22d3ee";
          const isExpanded = isGroupExpanded(group.label);
          const itemCount = getGroupItemCount(group);

          // Check if any item in this group is currently active
          const hasActiveChild = group.items.some((item) => pathname === item.href);

          return (
            <div key={group.label}>
              {/* ── Group Header (all groups are collapsible) ────── */}
              {open ? (
                <div
                  className="mb-2 px-3 flex items-center justify-between cursor-pointer select-none group/header rounded-md py-1.5 -my-1 hover:bg-white/[0.03] transition-colors"
                  onClick={() => toggleGroup(group.label)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors",
                      hasActiveChild && !isExpanded ? "text-slate-300" : "text-slate-500",
                    )}>
                      {translatedGroup}
                    </div>

                    {/* Pulsing alert dot for Anomaly Intelligence when collapsed with alerts */}
                    {isAnomalyIntelGroup && !isExpanded && riskCounters.totalAlerts > 0 && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                      </span>
                    )}

                    {/* Active page dot for non-anomaly groups when collapsed */}
                    {!isAnomalyIntelGroup && !isExpanded && hasActiveChild && (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Active BU badge (Anomaly Intelligence only) */}
                    {isAnomalyIntelGroup && activeBU && (
                      <span
                        className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase shrink-0"
                        style={{ backgroundColor: activeBU.color + "20", color: activeBU.color }}
                      >
                        {activeBU.shortName}
                      </span>
                    )}

                    {/* Total alerts badge for Anomaly Intelligence when collapsed */}
                    {isAnomalyIntelGroup && !isExpanded && riskCounters.totalAlerts > 0 && (
                      <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500/20 px-1 text-[9px] font-bold text-rose-400 border border-rose-500/30">
                        {riskCounters.totalAlerts}
                      </span>
                    )}


                    {/* Chevron arrow */}
                    <motion.div
                      animate={{ rotate: isExpanded ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                      className="text-slate-500 group-hover/header:text-slate-300 transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.div>
                  </div>
                </div>
              ) : null}

              {/* ── Nav Items (animated collapse/expand) ────────── */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="space-y-1 overflow-hidden"
                  >
                    {group.items.map((item) => {
                      if (item.permission && !hasBypassRole && !permissions.includes(item.permission)) {
                        return null;
                      }
                      const active = pathname === item.href;
                      const translatedItem = t((navTranslationKeys[item.label] || item.label) as any);
                      const badge = isAnomalyIntelGroup ? getBadgeForHref(item.href) : null;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group relative flex h-10 items-center rounded-lg px-3 text-sm transition",
                            active ? "text-slate-100" : "text-slate-400 hover:bg-white/[0.07] hover:text-slate-100",
                            !open && "justify-center px-0",
                          )}
                          style={{
                            backgroundColor: active ? `${groupAccentColor}15` : undefined,
                            color: active ? groupAccentColor : undefined,
                          }}
                          aria-label={translatedItem}
                          title={!open ? translatedItem : undefined}
                        >
                          {active ? (
                            <span
                              className="absolute left-0 h-5 w-0.5 rounded-full"
                              style={{ backgroundColor: groupAccentColor }}
                            />
                          ) : null}

                          <span className="relative" style={{ color: active ? groupAccentColor : undefined }}>
                            <item.icon className="h-4 w-4 shrink-0" />
                            {/* Mini dot on icon when sidebar is collapsed and badge exists */}
                            {!open && badge && (
                              <span className={cn(
                                "absolute -right-1 -top-1 h-2 w-2 rounded-full border border-[#050b1a]",
                                badge.color,
                              )} />
                            )}
                          </span>

                          {open ? (
                            <span className="ml-3 flex flex-1 items-center justify-between truncate">
                              <span className="truncate">{translatedItem}</span>
                              {/* Badge counter (Anomaly Intelligence only) */}
                              {badge && (
                                <span
                                  className="ml-2 inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-bold border"
                                  style={{
                                    backgroundColor: `color-mix(in srgb, ${badge.color === "bg-rose-500" ? "#ef4444" : badge.color === "bg-amber-500" ? "#f59e0b" : badge.color === "bg-orange-500" ? "#f97316" : "#8b5cf6"} 20%, transparent)`,
                                    color: badge.color === "bg-rose-500" ? "#fca5a5" : badge.color === "bg-amber-500" ? "#fcd34d" : badge.color === "bg-orange-500" ? "#fdba74" : "#c4b5fd",
                                    borderColor: badge.color === "bg-rose-500" ? "rgba(239,68,68,0.3)" : badge.color === "bg-amber-500" ? "rgba(245,158,11,0.3)" : badge.color === "bg-orange-500" ? "rgba(249,115,22,0.3)" : "rgba(139,92,246,0.3)",
                                  }}
                                >
                                  {badge.count}
                                </span>
                              )}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}

                    {/* ── Anomaly Intelligence Summary Bar ──────────── */}
                    {isAnomalyIntelGroup && open && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="mx-1 mt-1 flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
                      >
                        <div className="flex flex-1 items-center gap-2">
                          <SummaryPill label="Anomaly" count={riskCounters.anomalies} color="#ef4444" />
                          <SummaryPill label="Critical" count={riskCounters.customers} color="#f59e0b" />
                          <SummaryPill label="Branch" count={riskCounters.branches} color="#f97316" />
                        </div>
                        {riskCounters.insights > 0 && (
                          <span className="text-[9px] text-cyan-400 font-mono">
                            {riskCounters.insights} insights
                          </span>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <Button
        variant="outline"
        size="icon"
        onClick={onToggle}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        className="absolute -right-3 top-20 h-7 w-7 rounded-full border-white/10 bg-[#081028]"
      >
        {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>
    </motion.aside>
  );
}

/** Tiny pill showing a metric in the summary bar */
function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: count > 0 ? color : "#334155" }}
      />
      <span
        className="text-[9px] font-mono font-bold"
        style={{ color: count > 0 ? color : "#475569" }}
      >
        {count}
      </span>
    </div>
  );
}
