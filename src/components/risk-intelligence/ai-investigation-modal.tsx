"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/shared/modal";
import { Brain, ShieldAlert, FileText, CheckCircle2, Copy, AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnomalyDetection } from "@/types/risk-intelligence";
import { useTranslation } from "@/hooks/use-translation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  anomaly: AnomalyDetection | null;
};

export function AIInvestigationModal({ isOpen, onClose, anomaly }: Props) {
  const { language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [investigationResult, setInvestigationResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !anomaly) return;

    setLoading(true);
    setInvestigationResult(null);

    fetch("/api/ai/investigate-anomaly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anomaly }),
    })
      .then((res) => res.json())
      .then((data) => {
        setInvestigationResult(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [isOpen, anomaly]);

  if (!anomaly) return null;

  const handleCopyWorkPaper = () => {
    if (investigationResult?.draftWorkPaper) {
      navigator.clipboard.writeText(investigationResult.draftWorkPaper);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI Root-Cause Investigation — [${anomaly.ruleCode}]`}
      maxWidth="3xl"
    >
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          <div className="text-center">
            <p className="text-sm font-semibold text-cyan-300">
              {language === "id"
                ? "AI Agent sedang menganalisis transaksi & bukti anomali..."
                : "AI Agent is analyzing transaction patterns & evidence..."}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Melakukan klasifikasi akar masalah, histori cabang, dan menyusun Kertas Kerja Audit
            </p>
          </div>
        </div>
      ) : investigationResult ? (
        <div className="space-y-5 text-sm">
          {/* Anomaly Brief Banner */}
          <div className="rounded-xl border border-white/10 bg-[#060e20] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-xs font-bold text-rose-300">
                  {anomaly.ruleCode}
                </span>
                <span className="font-bold text-white">{anomaly.ruleName}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Entitas: <span className="text-cyan-300 font-semibold">{anomaly.entityName}</span> ({anomaly.entityType}) • Cabang: {anomaly.outletName || "Holding"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400">Skor Risiko:</span>
              <span className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-3 py-1 font-mono text-base font-bold text-rose-400">
                {anomaly.riskScore}/100
              </span>
            </div>
          </div>

          {/* AI Root Cause Assessment Box */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-cyan-400" />
                <h4 className="font-bold text-cyan-300 uppercase tracking-wide text-xs">
                  {language === "id" ? "Hasil AI Root-Cause Diagnosis" : "AI Root-Cause Diagnosis"}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold font-mono text-cyan-300 border border-cyan-400/30">
                  Confidence: {investigationResult.confidenceScore}%
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono uppercase ${
                    investigationResult.rootCauseCategory === "FRAUD_INDICATOR"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : investigationResult.rootCauseCategory === "OPERATIONAL_BYPASS"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {investigationResult.rootCauseCategory.replace("_", " ")}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed pt-1">
              {investigationResult.investigationBrief}
            </p>
          </div>

          {/* Evidence Trail Timeline */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>{language === "id" ? "Jejak Bukti Transaksi (Evidence Trail)" : "Evidence Trail Timeline"}</span>
            </h4>
            <div className="space-y-2">
              {investigationResult.evidenceTrail?.map((ev: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs">
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300 shrink-0 mt-0.5">
                    {ev.date}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>{ev.description}</span>
                      {ev.amount > 0 && (
                        <span className="font-mono text-emerald-400 font-bold ml-2">
                          Rp {ev.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Ref: {ev.reference}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Audit Program */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{language === "id" ? "Rekomendasi Langkah Program Audit Spesifik" : "Recommended Audit Program Steps"}</span>
            </h4>
            <div className="space-y-1.5">
              {investigationResult.recommendedAuditProgram?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] p-2 border border-white/5 text-xs text-slate-200">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-300 font-mono">
                    {item.step}
                  </span>
                  <span className="flex-1">{item.action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Draft Work Paper Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <Button variant="outline" size="sm" onClick={handleCopyWorkPaper} className="gap-2 border-white/15 text-slate-300">
              <Copy className="h-3.5 w-3.5" />
              <span>{copied ? "Tersalin!" : "Salin Kertas Kerja Audit"}</span>
            </Button>

            <Button onClick={onClose} size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
              Tutup Modal Investigasi
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 text-xs">
          Gagal memuat hasil investigasi AI.
        </div>
      )}
    </Modal>
  );
}
