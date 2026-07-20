"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuditStore } from "@/hooks/use-audit-store";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";

export function OverviewCharts() {
  const { findings, audits } = useAuditStore();
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Audit Completion Trend: audits completed per month
  const auditTrend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currIdx = new Date().getMonth();
    const trend = [];
    
    for (let i = 5; i >= 1; i--) {
      let idx = currIdx - i;
      if (idx < 0) idx += 12;
      trend.push({ month: months[idx], completed: 0, findings: 0 });
    }
    
    // Current month with live data
    const completedThisMonth = audits.filter((a) => a.status === "Completed" || a.progress === 100).length;
    const findingsThisMonth = findings.length;
    trend.push({ 
      month: months[currIdx], 
      completed: completedThisMonth, 
      findings: findingsThisMonth,
    });
    
    return trend;
  }, [audits, findings]);

  // Findings by Business Unit
  const findingsByBU = useMemo(() => {
    if (findings.length === 0) return [{ name: "No Data", count: 0 }];
    const map: Record<string, number> = {};
    findings.forEach((f) => {
      const branchName = f.branch || "Unknown";
      map[branchName] = (map[branchName] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [findings]);

  if (!isMounted) return <div className="h-72 w-full animate-pulse bg-slate-800/50 rounded-xl"></div>;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>{t("dash.chartAuditTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={auditTrend} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFindings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)" }} />
                <Area type="monotone" dataKey="completed" stroke="#22d3ee" fill="url(#gradCompleted)" strokeWidth={2} name={t("dash.chartCompleted")} />
                <Area type="monotone" dataKey="findings" stroke="#fbbf24" fill="url(#gradFindings)" strokeWidth={2} name={t("dash.chartFindings")} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dash.chartFindingsByBU")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={findingsByBU} layout="vertical" margin={{ left: 6, right: 8, top: 8, bottom: 8 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)" }} />
                <Bar dataKey="count" fill="#22d3ee" radius={[0, 8, 8, 0]} name={t("dash.chartFindings")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
