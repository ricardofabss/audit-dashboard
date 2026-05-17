import { wbsCases } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function WBSPage() {
  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Whistleblowing System (WBS)" subtitle="Anonymous intake, AI classification, fraud scoring, and investigation routing." actions={[{ label: "Register Case", variant: "default" }, { label: "Security Settings" }]} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {wbsCases.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{item.id}</span>
                <Badge tone={item.score >= 85 ? "red" : item.score >= 70 ? "amber" : "cyan"}>{item.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="font-medium text-slate-100">{item.title}</div>
              <div className="text-xs text-slate-500">{item.category} • Reporter: {item.reporter}</div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400"><span>AI fraud score</span><span>{item.score}</span></div>
                <Progress value={item.score} indicatorClassName={item.score >= 85 ? "bg-rose-300" : "bg-amber-300"} />
              </div>
              <div className="text-xs text-slate-500">Age: {item.age}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
