import { findings } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function FollowUpPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Follow-up Monitoring" subtitle="Track remediation progress, ownership, due dates, and evidence for closure." actions={[{ label: "Send Reminder", variant: "default" }, { label: "Export Follow-up" }]} />
      <Card>
        <CardHeader><CardTitle>Remediation Tracker</CardTitle></CardHeader>
        <CardContent>
          <ModuleTable headers={["Finding ID", "Action Plan", "Owner", "Due Date", "Progress", "State"]}>
            {findings.map((item, idx) => (
              <tr key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>Implement control remediation checklist #{idx + 1}</TableCell>
                <TableCell>{item.owner}</TableCell>
                <TableCell>2026-10-{12 + idx}</TableCell>
                <TableCell><Progress value={item.progress} /></TableCell>
                <TableCell><Badge tone={item.progress >= 80 ? "emerald" : item.progress >= 50 ? "amber" : "red"}>{item.progress >= 80 ? "On Track" : item.progress >= 50 ? "Watch" : "At Risk"}</Badge></TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>
    </div>
  );
}
