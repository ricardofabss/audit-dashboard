import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Settings" subtitle="Workspace preferences, governance thresholds, and AI policy controls." />
      <Card>
        <CardHeader><CardTitle>Global Preferences</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input defaultValue="24" aria-label="Critical SLA in hours" />
          <Input defaultValue="85" aria-label="Fraud score escalation threshold" />
          <Input defaultValue="AuditSphere AI Workspace" aria-label="Workspace name" />
          <Input defaultValue="compliance@auditsphere.ai" aria-label="Compliance notification email" />
          <div className="md:col-span-2">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
