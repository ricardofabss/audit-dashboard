import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { executiveMetrics } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const toneClass = {
  cyan: "text-cyan-200",
  emerald: "text-emerald-200",
  amber: "text-amber-200",
  red: "text-rose-200",
  indigo: "text-indigo-200",
};

export function KPIGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {executiveMetrics.map((metric) => {
        const up = !metric.change.includes("due") && !metric.change.includes("escalated");
        return (
          <Card key={metric.label}>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{metric.label}</div>
                <Badge tone={metric.tone}>{up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}</Badge>
              </div>
              <div className={`text-3xl font-semibold ${toneClass[metric.tone]}`}>{metric.value}</div>
              <div className="text-xs text-slate-400">{metric.change}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
