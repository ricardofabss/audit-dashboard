"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Brain, Sparkles, X } from "lucide-react";
import { aiRecommendations } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function AIInsightPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label="Close AI panel backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-[390px] border-l border-white/10 bg-[#071129]/95 p-4 backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-300/20 text-indigo-200">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">AI Insight Panel</div>
                  <div className="text-[11px] text-slate-500">Live anomaly intelligence</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close AI panel" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="scrollbar-thin h-[calc(100%-4.5rem)] overflow-y-auto space-y-3 pr-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-rose-300" />
                    High Risk Alert
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-300">Duplicate vendor payment sequence detected in APAC procurement ledger.</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Fraud probability</span>
                      <span className="font-semibold text-rose-300">88%</span>
                    </div>
                    <Progress value={88} indicatorClassName="bg-rose-300" />
                  </div>
                  <Badge tone="red">Escalation recommended within 24h</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Brain className="h-4 w-4 text-cyan-200" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {aiRecommendations.map((item) => (
                    <div key={item} className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-xs text-slate-300">
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
