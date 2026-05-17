import { KPIGrid } from "@/components/dashboard/kpi-grid";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { ActivityStream } from "@/components/dashboard/activity-stream";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function DashboardPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title="Executive Command Center"
        subtitle="AI-powered audit intelligence across planning, findings, investigations, and risk posture."
        actions={[{ label: "Create Audit Plan", variant: "default" }, { label: "Export Executive Pack" }]}
      />
      <KPIGrid />
      <OverviewCharts />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityStream />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Audit Completion Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Q3 Financial Operations", value: 68, tone: "bg-cyan-300" },
              { label: "ITGC Privileged Access", value: 28, tone: "bg-amber-300" },
              { label: "Vendor Compliance Deep Dive", value: 46, tone: "bg-emerald-300" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="text-slate-400">{item.value}%</span>
                </div>
                <Progress value={item.value} indicatorClassName={item.tone} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
