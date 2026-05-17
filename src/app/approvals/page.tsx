import { findings } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { TaskOrderGenerator } from "@/modules/approvals/task-order-generator";

export default function ApprovalsPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Approval Workflow" subtitle="Route approvals for remediation plans, risk acceptance, case escalations, and auto-generated task orders." actions={[{ label: "Create Approval Chain", variant: "default" }, { label: "SLA Rules" }]} />
      <TaskOrderGenerator />
      <Card>
        <CardHeader><CardTitle>Pending Approvals</CardTitle></CardHeader>
        <CardContent>
          <ModuleTable headers={["Request", "Requester", "Approver", "Priority", "Status"]}>
            {findings.slice(0, 4).map((item) => (
              <tr key={item.id}>
                <TableCell>{item.id}: Remediation approval</TableCell>
                <TableCell>{item.owner}</TableCell>
                <TableCell>CAE / Legal</TableCell>
                <TableCell><Badge tone={item.severity === "Critical" ? "red" : "amber"}>{item.severity}</Badge></TableCell>
                <TableCell><Badge tone="indigo">{item.status}</Badge></TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>
    </div>
  );
}
