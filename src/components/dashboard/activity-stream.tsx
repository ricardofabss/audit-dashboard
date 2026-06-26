"use client";

import { useAuditStore } from "@/hooks/use-audit-store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivityStream() {
  const { activities } = useAuditStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.map((item, idx) => (
          <div key={`${item.title}-${idx}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
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
