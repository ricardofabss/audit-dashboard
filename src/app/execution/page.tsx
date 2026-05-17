import { audits, findings } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ModuleTable, TableCell } from "@/components/shared/module-table";

const audit = audits[0];

export default function ExecutionPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Audit Execution Workspace" subtitle="Digital working paper, fieldwork tracking, evidence review, and AI assistance." actions={[{ label: "Submit for Review", variant: "default" }, { label: "Generate Draft Report" }]} />
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Audit</div>
            <div className="text-lg font-semibold text-white">{audit.name}</div>
            <div className="text-sm text-slate-400">{audit.branch}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Lead Auditor</div>
            <div className="text-sm text-slate-200">{audit.lead}</div>
            <div className="text-xs text-slate-500">Due: 2026-10-15</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Execution Progress</span><span className="text-cyan-200">{audit.progress}%</span></div>
            <Progress value={audit.progress} />
            <Badge tone="amber">{audit.risk} Risk</Badge>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Checklist and Findings</CardTitle></CardHeader>
          <CardContent>
            <ModuleTable headers={["Control Test", "Severity", "Status", "Owner"]}>
              {findings.slice(0, 4).map((item) => (
                <tr key={item.id}>
                  <TableCell><div>{item.title}</div><div className="text-xs text-slate-500">{item.id}</div></TableCell>
                  <TableCell><SeverityBadge severity={item.severity} /></TableCell>
                  <TableCell><Badge tone="cyan">{item.status}</Badge></TableCell>
                  <TableCell>{item.owner}</TableCell>
                </tr>
              ))}
            </ModuleTable>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Evidence and AI</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed border-white/20 bg-black/25 p-3 text-center text-sm text-slate-400">Drag and drop evidence files</div>
            <div className="rounded-lg border border-indigo-300/20 bg-indigo-300/10 p-3 text-xs text-indigo-100">
              AI anomaly scan found three duplicate invoice signatures with 87% pattern match.
            </div>
            <Button className="w-full">Open Working Paper Panel</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
