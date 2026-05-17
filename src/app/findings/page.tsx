import { findings } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Progress } from "@/components/ui/progress";

export default function FindingsPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Findings Management" subtitle="Severity triage, SLA monitoring, status workflow, and follow-up progress." actions={[{ label: "Create Finding", variant: "default" }, { label: "Filter Panel" }]} />
      <Card>
        <CardHeader><CardTitle>Findings Register</CardTitle></CardHeader>
        <CardContent>
          <ModuleTable headers={["Finding", "Severity", "Status", "SLA", "Follow-up"]}>
            {findings.map((item) => (
              <tr key={item.id}>
                <TableCell><div className="font-medium">{item.title}</div><div className="text-xs text-slate-500">{item.id} • {item.branch}</div></TableCell>
                <TableCell><SeverityBadge severity={item.severity} /></TableCell>
                <TableCell><Badge tone="indigo">{item.status}</Badge></TableCell>
                <TableCell className="text-slate-300">{item.sla}</TableCell>
                <TableCell><Progress value={item.progress} /></TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>
    </div>
  );
}
