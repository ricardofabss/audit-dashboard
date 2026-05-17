import { branches, complianceFrameworks } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function CompliancePage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Compliance Monitoring" subtitle="Framework adherence, branch ranking, non-compliance visibility, and remediation health." actions={[{ label: "Generate Certificate", variant: "default" }, { label: "Run Gap Analysis" }]} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Overall Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-5xl font-semibold text-emerald-200">91%</div>
            <Badge tone="emerald">Satisfactory posture</Badge>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Framework Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {complianceFrameworks.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-slate-300">{item.name}</span><span className="text-slate-400">{item.score}%</span></div>
                <Progress value={item.score} indicatorClassName={item.score >= 90 ? "bg-emerald-300" : item.score >= 80 ? "bg-amber-300" : "bg-rose-300"} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Branch Ranking</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {branches.map((item) => (
            <div key={item.name} className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-sm text-slate-200">
              {item.name} • Compliance {item.compliance}% • Findings {item.findings}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
