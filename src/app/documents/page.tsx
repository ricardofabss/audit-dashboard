import { documents } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Button } from "@/components/ui/button";

export default function DocumentsPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Document Center" subtitle="Enterprise archive with search, versions, secure preview, and upload controls." actions={[{ label: "Upload Documents", variant: "default" }, { label: "Retention Policy" }]} />
      <Card>
        <CardContent className="flex flex-col gap-2 md:flex-row">
          <Input placeholder="Search by filename, tag, audit ID, or owner..." />
          <Button variant="outline">Filter</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Evidence and Reports</CardTitle></CardHeader>
        <CardContent>
          <ModuleTable headers={["Document", "Type", "Version", "Owner", "Modified"]}>
            {documents.map((item) => (
              <tr key={item.name}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.version}</TableCell>
                <TableCell>{item.owner}</TableCell>
                <TableCell>{item.modified}</TableCell>
              </tr>
            ))}
          </ModuleTable>
        </CardContent>
      </Card>
    </div>
  );
}
