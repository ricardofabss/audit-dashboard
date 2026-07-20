"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Script from "next/script";
import { PageHeader } from "@/components/shared/page-header";
import { Download, Upload } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LabelList, ComposedChart, Area } from "recharts";
import { summaryData, aumData, noaProductivityPerAuditor } from "@/lib/coverage-data";
import { generateWhatIfData, prescriptiveInsights } from "@/lib/ai-forecasting-data";
import { useAuditStore } from "@/hooks/use-audit-store";
import { ShieldAlert, AlertTriangle, TrendingUp, Info, Lightbulb } from "lucide-react";

export default function ReportDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [mppAdjustment, setMppAdjustment] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Nanti ini akan diganti dengan data dari file Excel yang diunggah
  const [dynamicSummary, setDynamicSummary] = useState(summaryData);
  const [dynamicAum, setDynamicAum] = useState(aumData);
  const [dynamicNoa, setDynamicNoa] = useState(noaProductivityPerAuditor);
  const [dynamicDateStr, setDynamicDateStr] = useState("Mei 2026");

  const forecastData = useMemo(() => generateWhatIfData(mppAdjustment), [mppAdjustment]);
  
  const currentInsight = useMemo(() => {
    return prescriptiveInsights.find(insight => insight.condition(mppAdjustment)) || prescriptiveInsights[1];
  }, [mppAdjustment]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'danger': return <ShieldAlert className="w-8 h-8 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      case 'success': return <TrendingUp className="w-8 h-8 text-emerald-500" />;
      case 'info': return <Info className="w-8 h-8 text-cyan-500" />;
      default: return <Lightbulb className="w-8 h-8 text-cyan-500" />;
    }
  };

  const getInsightBorder = (type: string) => {
    switch (type) {
      case 'danger': return 'border-rose-500/50 bg-rose-500/5 text-rose-800';
      case 'warning': return 'border-amber-500/50 bg-amber-500/5 text-amber-800';
      case 'success': return 'border-emerald-500/50 bg-emerald-500/5 text-emerald-800';
      case 'info': return 'border-cyan-500/50 bg-cyan-500/5 text-cyan-800';
      default: return 'border-slate-500/50 bg-slate-500/5 text-slate-800';
    }
  };
  
  useEffect(() => {
    setIsMounted(true);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/reporting/granular-bu");
      if (!res.ok) return;
      const data = await res.json();
      if (!data || data.length === 0) return; // leave as mock data if empty

      processDataAndRender(data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  };

  const processDataAndRender = (json: any[]) => {
    // PASS 1: Find the latest period per Business Unit
    const latestPeriodByBU: Record<string, number> = { gmn: 0, mulia: 0, pajak: 0 };
    for (const row of json) {
      const bu = String(row.bisnisUnit || row["Bisnis Unit"] || "Unknown").toLowerCase();
      let key = "gmn";
      if (bu.includes("mulia")) key = "mulia";
      else if (bu.includes("pajak")) key = "pajak";

      const rawPeriode = row.periode ?? row["Periode"];
      const parsedNum = Number(rawPeriode);
      if (!isNaN(parsedNum) && parsedNum > latestPeriodByBU[key]) {
        latestPeriodByBU[key] = parsedNum;
      }
    }
    
    // Update global date string based on the absolute latest period
    let maxOverallPeriod = 0;
    for (const val of Object.values(latestPeriodByBU)) {
      if (val > maxOverallPeriod) maxOverallPeriod = val;
    }
    
    if (maxOverallPeriod > 40000) {
      const d = new Date(Math.round((maxOverallPeriod - 25569) * 86400 * 1000));
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      setDynamicDateStr(`${months[d.getMonth()]} ${d.getFullYear()}`);
    }

    // PASS 2: Aggregate data
    const grouped: Record<string, any> = {
      gmn: { kcp: 0, noaAktif: 0, noaAudited: 0, auditor: 0, mpp: 0, aumAktif: 0, aumAudited: 0, noaProductivityBulan: 0, aumProductivityBulan: 0, branches: new Set<string>() },
      mulia: { kcp: 0, noaAktif: 0, noaAudited: 0, auditor: 0, mpp: 0, aumAktif: 0, aumAudited: 0, noaProductivityBulan: 0, aumProductivityBulan: 0, branches: new Set<string>() },
      pajak: { kcp: 0, noaAktif: 0, noaAudited: 0, auditor: 0, mpp: 0, aumAktif: 0, aumAudited: 0, noaProductivityBulan: 0, aumProductivityBulan: 0, branches: new Set<string>() }
    };
    
    // --- PHASE 6: Productivity Aggregation (All Periods) ---
    const periodMap: Record<string, Record<string, { totalNoa: number, maxAuditor: number, cumulativeNoaAudit: number }>> = {};

    for (const row of json) {
      const bu = String(row.bisnisUnit || row["Bisnis Unit"] || "Unknown").toLowerCase();
      let key = "gmn";
      if (bu.includes("mulia")) key = "mulia";
      else if (bu.includes("pajak")) key = "pajak";

      const rawPeriode = row.periode ?? row["Periode"];
      const parsedNum = Number(rawPeriode);
      
      // ONLY aggregate cross-sectional metrics for the LATEST period of this BU
      if (parsedNum === latestPeriodByBU[key]) {
        const cabang = String(row.cabangArea || row["Cabang/Area"] || "");
        if (cabang) grouped[key].branches.add(cabang);
        
        grouped[key].noaAktif += Number(row.noaAktif ?? row[" Noa aktif "]) || 0;
        grouped[key].noaAudited += Number(row.noaAudit ?? row[" Noa Audit "]) || 0;
        grouped[key].aumAktif += Number(row.aumAktif ?? row["Aum Aktif"]) || 0;
        grouped[key].aumAudited += Number(row.aumAudit ?? row["Aum Audit"]) || 0;
        
        const auditor = Number(row.auditorLapangan ?? row["Jumlah Auditor Lapangan"]) || 0;
        grouped[key].auditor = Math.max(grouped[key].auditor, auditor);

        const mpp = Number(row.mppAuditorLapangan ?? row["MPP Auditor Lapangan"] ?? row.mpp2026 ?? row["MPP 2026"]) || 0;
        grouped[key].mpp = Math.max(grouped[key].mpp, mpp);
        
        const noaProd = Number(row.noaProductivityBulan ?? row["NoA Productivity/Bulan"]) || 0;
        grouped[key].noaProductivityBulan = Math.max(grouped[key].noaProductivityBulan, noaProd);

        const aumProd = Number(row.aumProductivityBulan ?? row["AuM Productivity/Bulan"]) || 0;
        grouped[key].aumProductivityBulan = Math.max(grouped[key].aumProductivityBulan, aumProd);
      }

      // CHARTA DATA (periodMap): Aggregate for ALL periods
      let periodStr = String(rawPeriode);
      if (!isNaN(parsedNum) && parsedNum > 40000) {
        const d = new Date(Math.round((parsedNum - 25569) * 86400 * 1000));
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        periodStr = months[d.getMonth()] || periodStr;
      }

      if (!periodMap[periodStr]) {
        periodMap[periodStr] = { gmn: { totalNoa: 0, maxAuditor: 0, cumulativeNoaAudit: 0 }, mulia: { totalNoa: 0, maxAuditor: 0, cumulativeNoaAudit: 0 }, pajak: { totalNoa: 0, maxAuditor: 0, cumulativeNoaAudit: 0 } };
      }
      
      const noaAuditBulan = Number(row.noaAuditBulanBerjalan ?? ((Number(row["Noa Audit Bulan Berjalan (Emas)"]) || 0) + (Number(row["Noa Audit Bulan Berjalan (Elektronik)"]) || 0)));
      const auditor = Number(row.auditorLapangan ?? row["Jumlah Auditor Lapangan"]) || 0;
      const noaAudit = Number(row.noaAudit ?? row[" Noa Audit "]) || 0;
      
      periodMap[periodStr][key].totalNoa += noaAuditBulan;
      periodMap[periodStr][key].maxAuditor = Math.max(periodMap[periodStr][key].maxAuditor, auditor);
      periodMap[periodStr][key].cumulativeNoaAudit += noaAudit;
    }
    
    // Assign final KCP size
    grouped.gmn.kcp = grouped.gmn.branches.size;
    grouped.mulia.kcp = grouped.mulia.branches.size;
    grouped.pajak.kcp = grouped.pajak.branches.size;

    const newProductivityData = Object.keys(periodMap).map(p => ({
      month: p,
      gmn: periodMap[p].gmn.maxAuditor > 0 ? Math.round(periodMap[p].gmn.totalNoa / periodMap[p].gmn.maxAuditor) : 0,
      mulia: periodMap[p].mulia.maxAuditor > 0 ? Math.round(periodMap[p].mulia.totalNoa / periodMap[p].mulia.maxAuditor) : 0,
      pajak: periodMap[p].pajak.maxAuditor > 0 ? Math.round(periodMap[p].pajak.totalNoa / periodMap[p].pajak.maxAuditor) : 0,
    }));
    
    if (newProductivityData.length > 0) {
      setDynamicNoa(newProductivityData);
    }
    // ------------------------------------------

    setDynamicSummary((prev: any) => {
      const next = { ...prev };
      for (const key of Object.keys(grouped)) {
        if (next[key]) {
          const belum = grouped[key].noaAktif - grouped[key].noaAudited;
          const pct = (grouped[key].noaAudited / Math.max(1, grouped[key].noaAktif)) * 100;
          const buProductivity = Object.keys(periodMap).map(p => ({
            month: p.substring(0, 3) + "-26", // e.g., "Jan-26"
            value: periodMap[p][key as keyof typeof periodMap[p]].cumulativeNoaAudit
          }));

          next[key] = {
            ...next[key],
            kcp: grouped[key].kcp,
            noaAktif: grouped[key].noaAktif,
            noaAudited: grouped[key].noaAudited,
            auditor: grouped[key].auditor,
            mpp: String(grouped[key].mpp || next[key].mpp),
            noaProductivityBulan: grouped[key].noaProductivityBulan,
            aumProductivityBulan: grouped[key].aumProductivityBulan,
            coverage: [
              { name: "Audited", value: grouped[key].noaAudited, fill: next[key].color },
              { name: "Belum Teraudit", value: Math.max(0, belum), fill: "#94a3b8" }
            ],
            coveragePct: `${pct.toFixed(1)}%`,
            productivity: buProductivity.length > 0 ? buProductivity : next[key].productivity
          };
        }
      }
      return next;
    });

    setDynamicAum((prev: any) => {
      const next = [...prev];
      for (const key of Object.keys(grouped)) {
        const name = key === "gmn" ? "GMN" : key === "mulia" ? "GMS" : key.toUpperCase();
        const idx = next.findIndex(x => x.name === name);
        if (idx >= 0) {
          const audited = grouped[key].aumAudited;
          const belum = Math.max(0, grouped[key].aumAktif - audited);
          next[idx] = {
            ...next[idx],
            audited,
            belum,
            auditedLabel: `Rp ${(audited/1e9).toFixed(0)} Miliar`,
            belumLabel: `Rp ${(belum/1e9).toFixed(0)} Miliar`
          };
        }
      }
      return next;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;
      try {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
          alert("Modul pembaca Excel sedang dimuat. Silakan tunggu beberapa detik dan coba lagi.");
          return;
        }
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
        
        // Post to Database
        fetch("/api/reporting/granular-bu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: json }),
        })
        .then(async (res) => {
          if (res.ok) {
            // Render locally immediately
            processDataAndRender(json);
            // Fetch initial data again so that 'monthly-reports' gets the newly upserted DB records
            useAuditStore.getState().fetchInitialData();
            alert(`Berhasil menyimpan data ke Database! Dashboard telah diperbarui dengan data dari ${json.length} baris.`);
          } else {
            const err = await res.json();
            alert(`Gagal menyimpan ke database: ${err.error}`);
          }
        })
        .catch(console.error);

      } catch (err) {
        console.error("Error reading excel:", err);
        alert("Gagal membaca file Excel.");
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const renderBUColumn = (data: any) => {
    return (
      <div className="flex flex-col bg-white overflow-hidden shadow-sm border border-slate-200 rounded-xl print:shadow-none print:border-slate-300">
        <div className="text-center py-2 text-white font-bold text-xl print:text-lg" style={{ backgroundColor: data.color }}>
          {data.name}
        </div>
        <div className="p-0 flex-1 flex flex-col">
          {/* Header Stats */}
          <div className="grid grid-cols-5 text-center text-[10px] font-semibold border-b border-slate-100 bg-slate-50 text-slate-700 divide-x divide-slate-100">
            <div className="p-2">
              <div className="mb-1 text-[9px] text-slate-500">KCP/Unit</div>
              {data.kcp}
            </div>
            <div className="p-2">
              <div className="mb-1 text-[9px] text-slate-500">Noa Aktif</div>
              {data.noaAktif.toLocaleString("id-ID")}
            </div>
            <div className="p-2">
              <div className="mb-1 text-[9px] text-slate-500">Noa Audited</div>
              {data.noaAudited.toLocaleString("id-ID")}
            </div>
            <div className="p-2">
              <div className="mb-1 text-[9px] text-slate-500">Auditor</div>
              {data.auditor}
            </div>
            <div className="p-2">
              <div className="mb-1 text-[9px] text-slate-500">MPP 2026</div>
              {data.mpp}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 p-2 gap-2 flex-1">
            {/* Donut Chart */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-800 mb-2">Audit Coverage</span>
              <div className="h-[140px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.coverage}
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.coverage.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString("id-ID")} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold" style={{ color: data.color }}>{data.coveragePct}</span>
                </div>
              </div>
              {/* Custom Legend */}
              <div className="flex gap-3 text-[10px] mt-2 text-slate-600">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2" style={{ backgroundColor: data.color }}></div>
                  Audited
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-slate-400"></div>
                  Belum Teraudit
                </div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-800 mb-2">Trend NOA Audited</span>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.productivity} margin={{ top: 20, right: 25, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={35} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => v.toLocaleString("id-ID")} width={50} />
                    <Tooltip formatter={(value: number) => value.toLocaleString("id-ID")} labelStyle={{ color: '#1e293b' }} itemStyle={{ color: data.color }} />
                    <Line type="linear" dataKey="value" stroke={data.color} strokeWidth={3} dot={{ fill: data.color, r: 4 }} activeDot={{ r: 6 }}>
                      <LabelList dataKey="value" position="top" offset={8} style={{ fontSize: '9px', fill: '#475569' }} formatter={(v: number) => v.toLocaleString("id-ID")} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-10 print:p-0 print:m-0">
      <Script src="https://unpkg.com/xlsx/dist/xlsx.full.min.js" strategy="lazyOnload" />
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        style={{ display: "none" }} 
      />
      <div className="flex justify-between items-center print:hidden">
        <PageHeader title="Report Dashboard" subtitle="Export this dashboard to PDF for BOD presentation." />
        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Data Granular
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Presentation Container (A4 Landscape aspect ratio approximation) */}
      <div className="bg-slate-100 p-4 rounded-xl min-h-[700px] border border-slate-200 print:p-0 print:border-none print:bg-white flex flex-col gap-3 font-sans">
        
        {/* Header Title */}
        <div className="bg-[#0b1739] text-center py-4 rounded-t-lg print:rounded-none">
          <h1 className="text-3xl font-bold text-white mb-1">Internal Audit Coverage Dashboard</h1>
          <p className="text-cyan-200 text-sm">Data per akhir {dynamicDateStr}</p>
        </div>
        {isMounted && (
          <div className={`border shadow-sm rounded-xl p-4 flex gap-4 items-start animate-in fade-in slide-in-from-top-4 duration-500 print:hidden mx-4 mt-2 transition-colors ${getInsightBorder(currentInsight.type)}`}>
            <div className="p-2 rounded-lg bg-black/5">
              {getInsightIcon(currentInsight.type)}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold mb-1">Global AI Predictive & Prescriptive Insight (Holding Level)</h3>
              <p className="text-sm opacity-90 mb-2">{currentInsight.description}</p>
              <div className="text-xs font-semibold bg-black/5 px-2 py-1 rounded inline-block border border-black/10">
                Recommended Action: {currentInsight.action}
              </div>
            </div>
            <div className="w-64 border-l border-black/10 pl-4">
              <div className="text-xs font-medium mb-2 opacity-80">What-If: Central Auditor MPP Adjustment</div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] opacity-70">-20</span>
                <span className="text-sm font-bold">{mppAdjustment > 0 ? '+' : ''}{mppAdjustment}</span>
                <span className="text-[10px] opacity-70">+30</span>
              </div>
              <input 
                type="range" 
                min="-20" 
                max="30" 
                value={mppAdjustment} 
                onChange={(e) => setMppAdjustment(parseInt(e.target.value))}
                className="w-full h-1"
              />
            </div>
          </div>
        )}

        {/* Top 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {renderBUColumn(dynamicSummary.gmn)}
          {renderBUColumn(dynamicSummary.mulia)}
          {renderBUColumn(dynamicSummary.pajak)}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[250px]">
          
          {/* AUM Chart (Span 4) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
            <div className="py-2 px-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <h3 className="text-center text-sm font-semibold text-slate-700">AUM Aktif Audited per {dynamicDateStr}</h3>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-6 justify-center">
              {dynamicAum.map((aum: any) => {
                const total = aum.audited + aum.belum;
                const pct = total > 0 ? (aum.audited / total) * 100 : 0;
                const nameLabel = aum.name === "GMN" ? "Gadai Mas Nusantara (GMN)" : aum.name === "GMS" ? "Gadai Mulia Sejahtera (GMS)" : aum.name;
                const color = aum.name === "GMN" ? "#0ea5e9" : "#10b981";

                return (
                  <div key={aum.name} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs font-bold text-slate-500 mb-1">{nameLabel}</div>
                        <div className="text-lg font-black text-[#0b1739] leading-none">{aum.auditedLabel}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400">Belum Audited</div>
                        <div className="text-xs font-bold text-slate-600">{aum.belumLabel}</div>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} title={`Audited: ${pct.toFixed(1)}%`}></div>
                      <div className="h-full bg-slate-200" style={{ width: `${100 - pct}%` }}></div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Productivity Chart (Span 5) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
            <div className="py-2 px-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <h3 className="text-center text-sm font-semibold text-slate-700">Productivity Noa Audit Per-Auditor</h3>
            </div>
            <div className="p-4 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicNoa} margin={{ top: 20, right: 5, left: -20, bottom: 0 }} barSize={12} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="pajak" name="Pajak Mas" fill="#10b981" radius={[2, 2, 0, 0]}>
                    <LabelList dataKey="pajak" position="top" fontSize={8} fill="#64748b" />
                  </Bar>
                  <Bar dataKey="mulia" name="Gadai Mulia" fill="#f59e0b" radius={[2, 2, 0, 0]}>
                    <LabelList dataKey="mulia" position="top" fontSize={8} fill="#64748b" />
                  </Bar>
                  <Bar dataKey="gmn" name="Gadai Mas Nusantara" fill="#0ea5e9" radius={[2, 2, 0, 0]}>
                    <LabelList dataKey="gmn" position="top" fontSize={8} fill="#64748b" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Info Cards (Span 3) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Box 1 */}
            <div className="bg-[#e0e7ff] rounded-lg border border-[#c7d2fe] overflow-hidden flex flex-col shadow-sm">
              <div className="bg-[#1e3a8a] text-white text-center py-2 text-xs font-bold">
                Kekurangan MPP Auditor<br/>Lapangan GMN
              </div>
              <div className="flex p-3 text-center divide-x divide-[#c7d2fe]">
                <div className="flex-1 px-1">
                  <div className="text-[10px] font-bold text-slate-700 mb-1">Target<br/>MPP 2026</div>
                  <div className="text-xl font-black text-slate-800 leading-tight">{dynamicSummary.gmn.mpp}</div>
                  <div className="text-[10px] font-bold text-slate-800">Auditor</div>
                </div>
                <div className="flex-1 px-1">
                  <div className="text-[10px] font-bold text-slate-700 mb-1">Kondisi<br/>Saat Ini</div>
                  <div className="text-xl font-black text-slate-800 leading-tight">{dynamicSummary.gmn.auditor}</div>
                  <div className="text-[10px] font-bold text-slate-800">Auditor</div>
                </div>
              </div>
              <div className="bg-[#cbd5e1] text-center py-2 border-t border-white">
                <div className="text-[10px] font-bold text-slate-800">Kekurangan</div>
                <div className="text-[10px] font-bold text-slate-800">
                  {Math.max(0, Number(dynamicSummary.gmn.mpp) - Number(dynamicSummary.gmn.auditor))} Auditor
                </div>
                <div className="text-[9px] font-bold text-slate-700">
                  ({Number(dynamicSummary.gmn.mpp) > 0 ? ((Math.max(0, Number(dynamicSummary.gmn.mpp) - Number(dynamicSummary.gmn.auditor)) / Number(dynamicSummary.gmn.mpp)) * 100).toFixed(0) : 0}% Dari Target MPP 2026)
                </div>
              </div>
            </div>

            {/* Box 2 */}
            <div className="bg-[#f1f5f9] rounded-lg border border-[#cbd5e1] overflow-hidden flex-1 flex flex-col shadow-sm">
              <div className="bg-[#334155] text-white text-center py-2 text-xs font-bold">
                Jika MPP GMN<br/>Terpenuhi
              </div>
              <div className="flex-1 flex flex-col justify-center p-3 gap-3">
                {(() => {
                  const gmnMpp = Number(dynamicSummary.gmn.mpp) || 0;
                  const gmnNoaProd = Number(dynamicSummary.gmn.noaProductivityBulan) || 0;
                  const gmnAumProd = Number(dynamicSummary.gmn.aumProductivityBulan) || 0;
                  
                  const potensiNoa = gmnMpp * gmnNoaProd * 12;
                  const potensiAum = gmnMpp * gmnAumProd * 12;
                  
                  const activeNoa = Number(dynamicSummary.gmn.noaAktif) || 1;
                  const activeAum = Number(dynamicSummary.gmn.aumAktif) || 1;
                  
                  const formatRibu = (num: number) => {
                    if (num >= 1e6) return (num/1e6).toFixed(1).replace('.', ',') + " Juta";
                    if (num >= 1e3) return (num/1e3).toFixed(1).replace('.', ',') + " Ribu";
                    return num.toLocaleString("id-ID");
                  };
                  
                  const formatTriliun = (num: number) => {
                    if (num >= 1e12) return (num/1e12).toFixed(1).replace('.', ',') + " Triliun";
                    if (num >= 1e9) return (num/1e9).toFixed(1).replace('.', ',') + " Miliar";
                    if (num >= 1e6) return (num/1e6).toFixed(1).replace('.', ',') + " Juta";
                    return num.toLocaleString("id-ID");
                  };

                  return (
                    <>
                      <div className="text-center bg-[#e2e8f0] p-2 rounded">
                        <div className="text-xs font-bold text-slate-700">Coverage NOA</div>
                        <div className="text-lg font-black text-slate-800">{formatRibu(potensiNoa)}</div>
                        <div className="text-[10px] font-bold text-slate-700">({((potensiNoa / activeNoa) * 100).toFixed(0)}% Dari Jml Noa Aktif {dynamicDateStr})</div>
                      </div>
                      <div className="text-center bg-[#e2e8f0] p-2 rounded">
                        <div className="text-xs font-bold text-slate-700">Coverage AUM</div>
                        <div className="text-lg font-black text-slate-800">{formatTriliun(potensiAum)}</div>
                        <div className="text-[10px] font-bold text-slate-700">({((potensiAum / activeAum) * 100).toFixed(0)}% Dari Total AUM Aktif {dynamicDateStr})</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Global Print Styles override for accurate PDF rendering */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          nav, header, aside { display: none !important; }
        }
      `}} />
    </div>
  );
}
