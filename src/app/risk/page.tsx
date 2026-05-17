"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { riskRegister } from "@/lib/mock-data";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Progress } from "@/components/ui/progress";

export default function RiskPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Risk Management" subtitle="Risk heatmap, register, mitigation tracking, and predictive trend signals." actions={[{ label: "Add Risk", variant: "default" }, { label: "Run Prediction" }]} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>5x5 Heatmap</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-5 gap-1">
            {Array.from({ length: 25 }).map((_, idx) => {
              const v = idx + 1;
              const cls = v > 18 ? "bg-rose-400/30" : v > 10 ? "bg-amber-300/25" : "bg-emerald-300/25";
              return <div key={v} className={`aspect-square rounded-md border border-white/10 ${cls}`} />;
            })}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Risk Exposure Trend</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskRegister}>
                <XAxis dataKey="id" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)" }} />
                <Bar dataKey="likelihood" fill="#22d3ee" radius={6} />
                <Bar dataKey="impact" fill="#fbbf24" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Risk Register</CardTitle></CardHeader>
        <CardContent>
          <ModuleTable headers={["Risk", "Category", "Likelihood", "Impact", "Mitigation"]}>
            {riskRegister.map((item) => (
              <tr key={item.id}>
                <TableCell><div>{item.name}</div><div className="text-xs text-slate-500">{item.id} • {item.owner}</div></TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.likelihood}</TableCell>
                <TableCell>{item.impact}</TableCell>
                <TableCell><Progress value={item.mitigation} /></TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>
    </div>
  );
}
