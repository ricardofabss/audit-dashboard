"use client";

import { useState } from "react";
import { useAuditStore } from "@/hooks/use-audit-store";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";

const seed = "Summarize this week critical findings and recommend escalation order.";

export default function AIPage() {
  const { audits, findings, wbsCases, riskRegister, documents } = useAuditStore();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "AuditSphere Copilot ready. Ask me to 'summarize findings', 'list audits', 'analyze WBS cases', or 'show risks' to get a real-time AI analysis of your active workspace!",
    },
  ]);
  const [value, setValue] = useState(seed);

  const getAIResponse = (input: string) => {
    const query = input.toLowerCase();

    if (query.includes("finding") || query.includes("temuan")) {
      const open = findings.filter((f) => f.status !== "Resolved");
      const critical = open.filter((f) => f.severity === "Critical");
      const high = open.filter((f) => f.severity === "High");

      let response = `I detected **${open.length} active findings** in the system, including **${critical.length} Critical** and **${high.length} High** severity issues. \n\n`;
      if (critical.length > 0) {
        response += `### Critical Issues Requiring Immediate Action:\n`;
        critical.forEach((c) => {
          response += `- **${c.id}**: *"${c.title}"* at ${c.branch}. Remediation progress is currently ${c.progress}%. Owned by ${c.owner}.\n`;
        });
      }
      if (high.length > 0) {
        response += `\n### High Severity Findings:\n`;
        high.forEach((h) => {
          response += `- **${h.id}**: *"${h.title}"* (${h.branch}). Owned by ${h.owner}.\n`;
        });
      }
      response += `\n*Copilot Recommendation:* Initiate legal review or control re-design immediately for critical vulnerabilities that exceed the 3-day SLA threshold.`;
      return response;
    }

    if (query.includes("audit") || query.includes("planning") || query.includes("engagement") || query.includes("jadwal")) {
      let response = `Currently, there are **${audits.length} planned audits** registered in the system.\n\n`;
      response += `### Active Audit Engagements:\n`;
      audits.forEach((a) => {
        response += `- **${a.id}**: *"${a.name}"* (${a.branch}) - Status: **${a.status}** (${a.progress}% completed). Lead Auditor: ${a.lead}.\n`;
      });
      return response;
    }

    if (query.includes("wbs") || query.includes("whistleblower") || query.includes("fraud") || query.includes("aduan")) {
      const highWbs = wbsCases.filter((w) => w.score >= 80);
      let response = `### Whistleblowing System (WBS) Analysis:\nThere are **${wbsCases.length} active cases** logged in intake.\n\n`;
      response += `### Registered Cases:\n`;
      wbsCases.forEach((w) => {
        response += `- **${w.id}**: *"${w.title}"* (${w.category}) - AI Risk Index: **${w.score}/100** [Status: ${w.status}]. Reporter: ${w.reporter}.\n`;
      });
      if (highWbs.length > 0) {
        response += `\n*Action Required:* ${highWbs.length} case(s) exceed the AI fraud risk threshold of 80. I suggest initiating procurement/forensic audits immediately for those targets.`;
      }
      return response;
    }

    if (query.includes("risk") || query.includes("resiko") || query.includes("mitigation")) {
      let response = `### Current Risk Profile Register (${riskRegister.length} active vectors):\n\n`;
      riskRegister.forEach((r) => {
        response += `- **${r.id}**: *"${r.name}"* (${r.category}) - Likelihood: **${r.likelihood}/5**, Impact: **${r.impact}/5** [Mitigation level: **${r.mitigation}%**]. Owned by ${r.owner}.\n`;
      });
      return response;
    }

    // Default response
    return `### Copilot Analysis:
I parsed your query: *"${input}"*.

Here are the key points to consider:
1. **Workspace Size**: Your workspace contains **${audits.length} active audits** and **${findings.length} findings**.
2. **Remediation SLA**: I recommend reminding the owners of any findings showing progress below 50% that are nearing their SLA due date.
3. **Data Integrity**: I found **${documents.length} evidence packages** in the Document Center that support active audits.

*Ask me to "summarize findings", "list audits", "show WBS cases", or "list risks" to see real-time workspace data!*`;
  };

  const send = () => {
    if (!value.trim()) return;
    const userMessage = { role: "user", text: value };
    const botResponse = { role: "assistant", text: getAIResponse(value) };
    setMessages((items) => [...items, userMessage, botResponse]);
    setValue("");
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={t("ai.title")}
        subtitle={t("ai.subtitle")}
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="scrollbar-thin max-h-[60vh] min-h-[40vh] space-y-4 overflow-y-auto pr-1">
            {messages.map((item, idx) => (
              <div
                key={`${item.role}-${idx}`}
                className={
                  item.role === "user"
                    ? "ml-auto max-w-[80%] rounded-2xl bg-cyan-300/10 border border-cyan-400/20 p-4 text-sm text-cyan-200 shadow-md shadow-cyan-900/10"
                    : "max-w-[85%] rounded-2xl border border-white/10 bg-[#0c1328]/50 backdrop-blur-md p-4 text-sm text-slate-200 shadow-md leading-relaxed whitespace-pre-line"
                }
              >
                {item.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={t("ai.placeholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              className="flex-1"
            />
            <Button onClick={send} className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-semibold px-6">
              {t("ai.btnSend")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
