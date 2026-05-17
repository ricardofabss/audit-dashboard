import { activities } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivityStream() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.map((item) => (
          <div key={item.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-100">{item.title}</div>
              <Badge tone={item.tone}>{item.time}</Badge>
            </div>
            <div className="text-xs text-slate-400">{item.detail}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
