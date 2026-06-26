"use client";

import { motion } from "framer-motion";
import type { RiskLevel } from "@/types/risk-intelligence";

const levelConfig: Record<RiskLevel, { color: string; bg: string; glow: string; label: string }> = {
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", glow: "0 0 20px rgba(239,68,68,0.4)", label: "Critical" },
  HIGH:     { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", glow: "0 0 20px rgba(245,158,11,0.3)", label: "High" },
  MEDIUM:   { color: "#eab308", bg: "rgba(234,179,8,0.12)",  glow: "0 0 15px rgba(234,179,8,0.2)",  label: "Medium" },
  LOW:      { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  glow: "0 0 15px rgba(34,197,94,0.2)",  label: "Low" },
};

type Props = {
  score: number;
  size?: number;
  riskLevel?: RiskLevel;
  showLabel?: boolean;
  animate?: boolean;
};

export function RiskScoreGauge({ score, size = 120, riskLevel, showLabel = true, animate = true }: Props) {
  const level: RiskLevel = riskLevel || (score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW");
  const config = levelConfig[level];
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const dashOffset = circumference * (1 - progress / 100);
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <motion.circle
            cx={center} cy={center} r={radius}
            fill="none" stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: dashOffset }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ filter: config.glow }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-mono font-bold"
            style={{ color: config.color, fontSize: size * 0.28 }}
            initial={animate ? { opacity: 0, scale: 0.5 } : {}}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {score}
          </motion.span>
        </div>
      </div>
      {showLabel && (
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
          style={{ color: config.color, backgroundColor: config.bg, borderColor: `${config.color}30` }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
