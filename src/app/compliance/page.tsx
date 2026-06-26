"use client";

import { branches, complianceFrameworks } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/hooks/use-translation";

export default function CompliancePage() {
  const { t } = useTranslation();

  const handleGenerateCertificate = () => {
    alert("Compliance Certificate successfully generated and signed for EMEA Nordics (93% adherence score)!");
  };

  const handleGapAnalysis = () => {
    alert("AI Gap Analysis completed!\n\nIdentified Gaps:\n- SOX Controls: 6 control weaknesses\n- ISO 27001: 9 technical evidence gaps\n- Anti-Bribery: 14 training compliance gaps\n\nAI remediation recommendations have been sent to the AI Assistant.");
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("compliance.title")}
        subtitle={t("compliance.subtitle")}
        actions={[
          { label: t("compliance.btnCertificate"), variant: "default", onClick: handleGenerateCertificate },
          { label: t("compliance.btnGap"), onClick: handleGapAnalysis },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("compliance.overallTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-5xl font-semibold text-emerald-200">91%</div>
            <Badge tone="emerald">Satisfactory posture</Badge>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("compliance.frameworkTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {complianceFrameworks.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300 font-medium">{item.name}</span>
                  <span className="text-slate-400">{item.score}%</span>
                </div>
                <Progress
                  value={item.score}
                  indicatorClassName={
                    item.score >= 90 ? "bg-emerald-300" : item.score >= 80 ? "bg-amber-300" : "bg-rose-300"
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("compliance.rankingTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {branches.map((item) => (
            <div
              key={item.name}
              className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-200 flex justify-between items-center"
            >
              <div>
                <span className="font-semibold text-slate-100">{item.name}</span>
                <span className="text-slate-400"> • Active Findings: {item.findings}</span>
              </div>
              <Badge tone={item.compliance >= 90 ? "emerald" : "amber"}>
                {item.compliance}% Compliance
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
