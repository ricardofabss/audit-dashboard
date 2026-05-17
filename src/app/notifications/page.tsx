import { activities } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationsPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Notifications" subtitle="Alerts and workflow updates across audits, cases, and remediation actions." />
      <Card>
        <CardHeader><CardTitle>Latest Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {activities.map((item) => (
            <div key={item.title} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-100">{item.title}</div>
                <Badge tone={item.tone}>{item.time}</Badge>
              </div>
              <div className="text-xs text-slate-400">{item.detail}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
