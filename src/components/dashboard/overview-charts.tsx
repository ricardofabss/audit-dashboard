"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { branches, fraudTrend } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OverviewCharts() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Fraud Trend Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fraudTrend} margin={{ left: -18, right: 8, top: 8 }}>
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
          <CardTitle>Branch Risk Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branches} layout="vertical" margin={{ left: 6, right: 8, top: 8, bottom: 8 }}>
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
