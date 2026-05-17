import { audits } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";

export default function PlanningPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Audit Planning" subtitle="Risk-based annual planning, scheduling, and auditor assignment." actions={[{ label: "Create Plan", variant: "default" }, { label: "Open Calendar" }]} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Annual Audit Calendar</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="text-slate-500">{day}</div>)}
              {Array.from({ length: 35 }).map((_, idx) => (
                <div key={idx} className="aspect-square rounded-lg border border-white/10 bg-black/20 p-1 text-left text-[11px] text-slate-400">
                  {idx % 5 === 0 ? <Badge tone="cyan">AUD</Badge> : idx % 8 === 0 ? <Badge tone="amber">RISK</Badge> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Risk Matrix Snapshot</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-5 gap-1">
            {Array.from({ length: 25 }).map((_, idx) => {
              const val = idx + 1;
              const tone = val > 18 ? "bg-rose-400/25" : val > 10 ? "bg-amber-300/20" : "bg-emerald-300/20";
              return <div key={val} className={`aspect-square rounded-md border border-white/10 ${tone}`} />;
            })}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Planned Audits</CardTitle></CardHeader>
        <CardContent>
          <ModuleTable headers={["Audit", "Branch", "Lead", "Status", "Progress"]}>
            {audits.map((audit) => (
              <tr key={audit.id}>
                <TableCell><div className="font-medium">{audit.name}</div><div className="text-xs text-slate-500">{audit.id}</div></TableCell>
                <TableCell>{audit.branch}</TableCell>
                <TableCell>{audit.lead}</TableCell>
                <TableCell><Badge tone="indigo">{audit.status}</Badge></TableCell>
                <TableCell>{audit.progress}%</TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>
    </div>
  );
}
