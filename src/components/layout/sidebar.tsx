"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navGroups, productIcon as ProductIcon } from "./navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { useActiveBU } from "@/hooks/use-business-unit";

const navTranslationKeys: Record<string, string> = {
  "Command Center": "nav.commandCenter",
  "Risk Intelligence": "nav.riskIntelligence",
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
  "AI Assistant": "nav.ai",
  "Notifications": "nav.notifications",
  "User Management": "nav.users",
  "Settings": "nav.settings",
};

export function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { identity } = useAuth();
  const { t } = useTranslation();
  const permissions = identity?.permissions ?? [];
  const roles = identity?.roles ?? [];
  const hasBypassRole = roles.includes("OWNER") || roles.includes("ADMIN");
  const activeBU = useActiveBU();

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

      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => {
          const translatedGroup = t((navTranslationKeys[group.label] || group.label) as any);
          const isRiskIntelGroup = group.label === "Risk Intelligence";
          const groupAccentColor = (isRiskIntelGroup && activeBU) ? activeBU.color : "#22d3ee";

          return (
            <div key={group.label}>
              {open ? (
                <div className="mb-2 px-3 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{translatedGroup}</div>
                  {isRiskIntelGroup && activeBU && (
                    <span
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase shrink-0"
                      style={{ backgroundColor: activeBU.color + "20", color: activeBU.color }}
                    >
                      {activeBU.shortName}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="space-y-1">
                {group.items.map((item) => {
                  if (item.permission && !hasBypassRole && !permissions.includes(item.permission)) {
                    return null;
                  }
                  const active = pathname === item.href;
                  const translatedItem = t((navTranslationKeys[item.label] || item.label) as any);
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
                      <span style={{ color: active ? groupAccentColor : undefined }}>
                        <item.icon className="h-4 w-4 shrink-0" />
                      </span>
                      {open ? <span className="ml-3 truncate">{translatedItem}</span> : null}
                    </Link>
                  );
                })}
              </div>
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
