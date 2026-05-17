import * as React from "react";
import { cn } from "@/lib/utils";

const toneMap = {
  cyan: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  emerald: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  amber: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  red: "border-rose-300/30 bg-rose-300/10 text-rose-200",
  indigo: "border-indigo-300/30 bg-indigo-300/10 text-indigo-200",
  slate: "border-white/10 bg-white/5 text-slate-300",
};

export function Badge({
  className,
  tone = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof toneMap }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-medium",
        toneMap[tone],
        className,
      )}
      {...props}
    />
  );
}
