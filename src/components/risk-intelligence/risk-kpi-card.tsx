"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ComponentType } from "react";

type Props = {
  label: string;
  value: string | number;
  change: string;
  changeValue?: number;
  icon: ComponentType<{ className?: string }>;
  color: "cyan" | "amber" | "rose" | "emerald" | "violet";
  sparkData?: number[];
};

const colorMap = {
  cyan:    { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-300", icon: "text-cyan-400", glow: "shadow-cyan-500/10" },
  amber:   { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-300", icon: "text-amber-400", glow: "shadow-amber-500/10" },
  rose:    { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-300", icon: "text-rose-400", glow: "shadow-rose-500/10" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300", icon: "text-emerald-400", glow: "shadow-emerald-500/10" },
  violet:  { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-300", icon: "text-violet-400", glow: "shadow-violet-500/10" },
};

const sparkColors = {
  cyan: "#22d3ee", amber: "#fbbf24", rose: "#f43f5e", emerald: "#34d399", violet: "#a78bfa",
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 64;
  const step = w / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RiskKPICard({ label, value, change, changeValue, icon: Icon, color, sparkData }: Props) {
  const c = colorMap[color];
  const isPositive = changeValue !== undefined ? changeValue > 0 : change.startsWith("+");
  const isNeutral = changeValue === 0 || change === "0%";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-xl border ${c.border} ${c.bg} p-4 shadow-lg ${c.glow}`}
    >
      {/* Background glow */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${c.bg} blur-2xl opacity-50`} />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className={`text-2xl font-bold font-mono tracking-tight ${c.text}`}>
            {value}
          </p>
          <div className="flex items-center gap-1.5">
            {isNeutral ? (
              <Minus className="h-3 w-3 text-slate-400" />
            ) : isPositive ? (
              <ArrowUp className="h-3 w-3 text-rose-400" />
            ) : (
              <ArrowDown className="h-3 w-3 text-emerald-400" />
            )}
            <span className={`text-[11px] font-medium ${isNeutral ? "text-slate-400" : isPositive ? "text-rose-400" : "text-emerald-400"}`}>
              {change}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={`grid h-10 w-10 place-items-center rounded-lg ${c.bg} border ${c.border}`}>
            <Icon className={`h-5 w-5 ${c.icon}`} />
          </div>
          {sparkData && <MiniSparkline data={sparkData} color={sparkColors[color]} />}
        </div>
      </div>
    </motion.div>
  );
}
