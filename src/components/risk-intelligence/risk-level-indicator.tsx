"use client";

import type { RiskLevel } from "@/types/risk-intelligence";
import { useTranslation } from "@/hooks/use-translation";

type Props = {
  level: RiskLevel;
  size?: "sm" | "md";
};

const config: Record<RiskLevel, { bg: string; text: string; key: string }> = {
  CRITICAL: { bg: "bg-rose-500/20 border-rose-500/30", text: "text-rose-300", key: "ri.critical" },
  HIGH:     { bg: "bg-amber-500/20 border-amber-500/30", text: "text-amber-300", key: "ri.high" },
  MEDIUM:   { bg: "bg-yellow-500/20 border-yellow-500/30", text: "text-yellow-300", key: "ri.medium" },
  LOW:      { bg: "bg-emerald-500/20 border-emerald-500/30", text: "text-emerald-300", key: "ri.low" },
};

export function RiskLevelIndicator({ level, size = "sm" }: Props) {
  const { t } = useTranslation();
  const c = config[level];
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wider ${c.bg} ${c.text} ${sizeClass}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${level === "CRITICAL" ? "bg-rose-400 animate-pulse" : level === "HIGH" ? "bg-amber-400" : level === "MEDIUM" ? "bg-yellow-400" : "bg-emerald-400"}`} />
      {t(c.key as any)}
    </span>
  );
}
