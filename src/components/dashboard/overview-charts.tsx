"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuditStore } from "@/hooks/use-audit-store";
import { useMemo, useState, useEffect } from "react";
import { useBusinessUnitStore } from "@/hooks/use-business-unit";

export function OverviewCharts() {
  const { findings, wbsCases } = useAuditStore();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dynamicBranches = useMemo(() => {
    if (findings.length === 0) return [{ name: "No Data", risk: 0 }];
    const map: Record<string, number> = {};
    findings.forEach((f) => {
      const branchName = f.branch || "Unknown";
      map[branchName] = (map[branchName] || 0) + (f.risk || 10);
    });
    return Object.entries(map)
      .map(([name, risk]) => ({ name, risk }))
      .sort((a, b) => b.risk - a.risk);
  }, [findings]);

  const dynamicTrend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currIdx = new Date().getMonth();
    const trend = [];
    
    // 5 previous months with 0
    for (let i = 5; i >= 1; i--) {
      let idx = currIdx - i;
      if (idx < 0) idx += 12;
      trend.push({ month: months[idx], anomalies: 0, fraud: 0, wbs: 0 });
    }
    
    // Current month with live data
    trend.push({ 
      month: months[currIdx], 
      anomalies: wbsCases.length * 2, 
      fraud: findings.length, 
      wbs: wbsCases.length 
    });
    
    return trend;
  }, [findings, wbsCases]);

  if (!isMounted) return <div className="h-72 w-full animate-pulse bg-slate-800/50 rounded-xl"></div>;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Fraud Trend Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicTrend} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="anomaly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)" }} />
                <Area type="monotone" dataKey="anomalies" stroke="#22d3ee" fill="url(#anomaly)" strokeWidth={2} />
                <Area type="monotone" dataKey="fraud" stroke="#fb7185" fill="url(#fraud)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {activeBUId ? "Branch Risk Ranking" : "Business Unit Risk Ranking"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicBranches} layout="vertical" margin={{ left: 6, right: 8, top: 8, bottom: 8 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1739", border: "1px solid rgba(255,255,255,0.15)" }} />
                <Bar dataKey="risk" fill="#fbbf24" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
