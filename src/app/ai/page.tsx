"use client";

import { useState } from "react";
import { aiRecommendations } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const seed = "Summarize this week critical findings and recommend escalation order.";

export default function AIPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "AuditSphere Copilot ready. Ask for summarization, fraud analysis, or remediation recommendations." },
  ]);
  const [value, setValue] = useState(seed);

  const send = () => {
    if (!value.trim()) return;
    setMessages((items) => [...items, { role: "user", text: value }, { role: "assistant", text: aiRecommendations[0] }]);
    setValue("");
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="AI Assistant" subtitle="Copilot for audit summarization, risk analysis, and recommendation generation." />
      <Card>
        <CardContent className="space-y-4">
          <div className="scrollbar-thin max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {messages.map((item, idx) => (
              <div key={`${item.role}-${idx}`} className={item.role === "user" ? "ml-auto max-w-[80%] rounded-lg bg-cyan-300/20 p-3 text-sm text-cyan-100" : "max-w-[85%] rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-200"}>
                {item.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ask copilot..." />
            <Button onClick={send}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
