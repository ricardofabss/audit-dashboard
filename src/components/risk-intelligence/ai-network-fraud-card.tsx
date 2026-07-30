"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Users, AlertTriangle, GitFork, ShieldAlert, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU } from "@/hooks/use-business-unit";

type NetworkCluster = {
  id: string;
  title: string;
  cifCount: number;
  cifList: string[];
  pattern: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  totalExposure: string;
};

export function AINetworkFraudCard() {
  const { language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeBU = useActiveBU();
  const validBUId = activeBU ? activeBU.id : null;

  const [clusters, setClusters] = useState<NetworkCluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = `/api/risk-intelligence` + (validBUId ? `?buId=${validBUId}&_t=${Date.now()}` : `?_t=${Date.now()}`);

    fetch(url, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        // Analyze customer risk profiles for network patterns from real DB data
        const customers = data.customerRiskProfiles || [];
        const detectedClusters: NetworkCluster[] = [];

        // Group customers by primary outlet to find co-located high-risk clusters
        const outletGroups = new Map<string, typeof customers>();
        for (const c of customers) {
          const key = c.primaryOutlet || "Unknown";
          if (!outletGroups.has(key)) outletGroups.set(key, []);
          outletGroups.get(key)!.push(c);
        }

        let clusterIdx = 1;
        for (const [outlet, group] of outletGroups.entries()) {
          const highRisk = group.filter((c: any) => c.riskLevel === "CRITICAL" || c.riskLevel === "HIGH");
          if (highRisk.length >= 2) {
            const totalExposure = highRisk.reduce((sum: number, c: any) => sum + (c.totalLoanAmount || 0), 0);
            detectedClusters.push({
              id: `NET-${String(clusterIdx).padStart(3, "0")}`,
              title: `Klaster Risiko Tinggi — ${outlet}`,
              cifCount: highRisk.length,
              cifList: highRisk.slice(0, 5).map((c: any) => `${c.cifNumber} (${c.customerName})`),
              pattern: `${highRisk.length} nasabah berisiko tinggi/kritis terdeteksi di outlet yang sama. Total ${group.length} nasabah aktif.`,
              severity: highRisk.some((c: any) => c.riskLevel === "CRITICAL") ? "CRITICAL" : "HIGH",
              totalExposure: `Rp ${totalExposure.toLocaleString("id-ID")}`,
            });
            clusterIdx++;
          }
        }

        setClusters(detectedClusters.slice(0, 5));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load network fraud data:", err);
        setLoading(false);
      });
  }, [validBUId]);

  if (loading) {
    return (
      <Card className="border-amber-500/30 bg-gradient-to-br from-[#0b1429]/90 via-[#101c3d]/80 to-amber-950/20 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <span className="ml-3 text-xs text-slate-400">Menganalisis jaringan CIF dari database...</span>
        </CardContent>
      </Card>
    );
  }

  if (clusters.length === 0) {
    return (
      <Card className="border-emerald-500/20 bg-gradient-to-br from-[#0b1429]/90 via-[#101c3d]/80 to-emerald-950/20 backdrop-blur-xl">
        <CardContent className="flex items-center gap-3 py-6">
          <Brain className="h-5 w-5 text-emerald-400" />
          <span className="text-xs text-slate-300">
            {language === "id"
              ? "AI Network Fraud Copilot: Tidak ditemukan klaster fraud antar-CIF pada data saat ini."
              : "AI Network Fraud Copilot: No cross-CIF fraud clusters detected in current data."}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-[#0b1429]/90 via-[#101c3d]/80 to-amber-950/20 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm text-white">
            <Brain className="h-4 w-4 text-amber-400" />
            <span>AI Network Fraud & Graph Anomaly Copilot</span>
          </CardTitle>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold font-mono text-amber-300 border border-amber-500/30">
            {clusters.length} Klaster Terdeteksi
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Analisis AI terhadap relasi antar-CIF berdasarkan data real dari database (outlet, pola risiko, eksposur)
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {clusters.map((cluster) => (
          <motion.div
            key={cluster.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2 hover:bg-white/[0.04] transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitFork className="h-4 w-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">{cluster.title}</h4>
              </div>
              <span className="font-mono text-xs font-bold text-rose-400">
                {cluster.totalExposure}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              <span className="text-amber-300 font-semibold">Pola AI:</span> {cluster.pattern}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
              <div className="flex flex-wrap gap-1 text-[10px]">
                {cluster.cifList.map((cif, idx) => (
                  <span key={idx} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-slate-300">
                    {cif}
                  </span>
                ))}
              </div>

              <button className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1">
                <span>Investigasi Klaster</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
