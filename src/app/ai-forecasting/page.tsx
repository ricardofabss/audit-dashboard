"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { generateWhatIfData, prescriptiveInsights, generateRiskWhatIfData, riskPrescriptiveInsights } from "@/lib/ai-forecasting-data";
import { Bot, AlertTriangle, Lightbulb, TrendingUp, Info, ShieldAlert, Cpu, Activity, ShieldCheck, DollarSign, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AIForecastingPage() {
  // Coverage Simulator State
  const [mppAdjustment, setMppAdjustment] = useState<number>(0);
  const [techAdoption, setTechAdoption] = useState<number>(30);

  // Risk Simulator State
  const [stressFactor, setStressFactor] = useState<number>(20);
  const [mitigationBudget, setMitigationBudget] = useState<number>(50);

  // Data Memoization
  const coverageData = useMemo(() => generateWhatIfData(mppAdjustment, techAdoption), [mppAdjustment, techAdoption]);
  const riskData = useMemo(() => generateRiskWhatIfData(stressFactor, mitigationBudget), [stressFactor, mitigationBudget]);
  
  const currentCoverageInsight = useMemo(() => {
    return prescriptiveInsights.find(insight => insight.condition(mppAdjustment, techAdoption)) || prescriptiveInsights[prescriptiveInsights.length - 1];
  }, [mppAdjustment, techAdoption]);

  const currentRiskInsight = useMemo(() => {
    return riskPrescriptiveInsights.find(insight => insight.condition(stressFactor, mitigationBudget)) || riskPrescriptiveInsights[riskPrescriptiveInsights.length - 1];
  }, [stressFactor, mitigationBudget]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'danger': return <ShieldAlert className="w-8 h-8 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />;
      case 'warning': return <AlertTriangle className="w-8 h-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />;
      case 'success': return <TrendingUp className="w-8 h-8 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />;
      case 'info': return <Info className="w-8 h-8 text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />;
      default: return <Lightbulb className="w-8 h-8 text-cyan-500" />;
    }
  };

  const getInsightBorder = (type: string) => {
    switch (type) {
      case 'danger': return 'border-rose-500/50 bg-gradient-to-br from-rose-500/10 to-rose-900/10 shadow-[0_0_20px_rgba(244,63,94,0.1)]';
      case 'warning': return 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-amber-900/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]';
      case 'success': return 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]';
      case 'info': return 'border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-cyan-900/10 shadow-[0_0_20px_rgba(6,182,212,0.1)]';
      default: return 'border-slate-500/50 bg-slate-500/5';
    }
  };

  return (
    <div className="space-y-8 pb-14 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <PageHeader 
          title="Predictive What-If Simulators" 
          subtitle="Advanced AI-driven scenario modeling for Audit Coverage & Systemic Risk Contagion."
        />
      </motion.div>

      {/* --- SIMULATOR 1: RISK & STRESS --- */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Activity className="w-6 h-6 text-rose-400" />
          Systemic Risk & Contagion Simulator
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            <Card className="bg-slate-900/60 border-rose-500/20 shadow-2xl backdrop-blur-md">
              <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-rose-300 text-lg">
                  <ShieldCheck className="w-5 h-5" /> Scenario Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Activity className="w-4 h-4 text-rose-400" /> Macro Stress Factor</label>
                    <span className="text-lg font-black text-rose-400">{stressFactor}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={stressFactor} 
                    onChange={(e) => setStressFactor(parseInt(e.target.value))}
                    className="w-full accent-rose-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                    <span>Stable (0)</span><span>Recession (100)</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Mitigation Budget</label>
                    <span className="text-lg font-black text-emerald-400">{mitigationBudget}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={mitigationBudget} 
                    onChange={(e) => setMitigationBudget(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                    <span>Low (0)</span><span>Max (100)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentRiskInsight.title}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`border-l-4 shadow-xl backdrop-blur-md transition-all duration-300 ${getInsightBorder(currentRiskInsight.type)}`}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getInsightIcon(currentRiskInsight.type)}</div>
                      <div>
                        <h4 className="font-bold text-slate-100 text-lg mb-1">{currentRiskInsight.title}</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{currentRiskInsight.description}</p>
                      </div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg border border-white/5 mt-4">
                      <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Bot className="w-3 h-3" /> Prescriptive Action
                      </h4>
                      <p className="text-sm text-slate-200 font-medium">{currentRiskInsight.action}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="xl:col-span-2">
            <Card className="bg-slate-900/60 border-white/10 shadow-2xl backdrop-blur-md h-full flex flex-col">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Critical Findings Projection</CardTitle>
                <p className="text-xs text-slate-400 mt-1">Simulated impact of macro stress vs budget over the next 6 months.</p>
              </CardHeader>
              <CardContent className="flex-1 min-h-[350px] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={riskData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    
                    <Area type="monotone" dataKey="predictedCritical" stroke="none" fill="url(#colorRisk)" name="Risk Volume Area" connectNulls />
                    <Line type="monotone" dataKey="historicalCritical" stroke="#94a3b8" strokeWidth={3} name="Historical Critical Issues" dot={{ r: 4, fill: '#94a3b8', strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
                    <Line type="monotone" dataKey="predictedCritical" stroke="#f43f5e" strokeWidth={4} strokeDasharray="5 5" name="Forecasted Critical Issues" dot={{ r: 5, fill: '#f43f5e', strokeWidth: 2, stroke: '#020617' }} activeDot={{ r: 8 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* --- SIMULATOR 2: AUDIT COVERAGE --- */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="pt-8 border-t border-white/10">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
          Audit Coverage & Resource Simulator
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            <Card className="bg-slate-900/60 border-cyan-500/20 shadow-2xl backdrop-blur-md">
              <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-cyan-300 text-lg">
                  <Users className="w-5 h-5" /> Resource Variables
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400" /> Auditor MPP Adjust</label>
                    <span className={`text-lg font-black ${mppAdjustment < 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {mppAdjustment > 0 ? '+' : ''}{mppAdjustment} Staff
                    </span>
                  </div>
                  <input 
                    type="range" min="-20" max="30" value={mppAdjustment} 
                    onChange={(e) => setMppAdjustment(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                    <span>-20 (Cut)</span><span>0</span><span>+30 (Hire)</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Cpu className="w-4 h-4 text-purple-400" /> AI Tech Adoption</label>
                    <span className="text-lg font-black text-purple-400">{techAdoption}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={techAdoption} 
                    onChange={(e) => setTechAdoption(parseInt(e.target.value))}
                    className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                    <span>Manual (0)</span><span>Automated (100)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentCoverageInsight.title}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`border-l-4 shadow-xl backdrop-blur-md transition-all duration-300 ${getInsightBorder(currentCoverageInsight.type)}`}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getInsightIcon(currentCoverageInsight.type)}</div>
                      <div>
                        <h4 className="font-bold text-slate-100 text-lg mb-1">{currentCoverageInsight.title}</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{currentCoverageInsight.description}</p>
                      </div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg border border-white/5 mt-4">
                      <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Bot className="w-3 h-3" /> Prescriptive Action
                      </h4>
                      <p className="text-sm text-slate-200 font-medium">{currentCoverageInsight.action}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="xl:col-span-2">
            <Card className="bg-slate-900/60 border-white/10 shadow-2xl backdrop-blur-md h-full flex flex-col">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Coverage & Efficiency Projection</CardTitle>
                <p className="text-xs text-slate-400 mt-1">Consolidated audit completion based on human and AI resources.</p>
              </CardHeader>
              <CardContent className="flex-1 min-h-[350px] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={coverageData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 'dataMax + 20']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    
                    <Area type="monotone" dataKey="upperBound" stroke="none" fill="url(#colorConfidence)" name="Upper Confidence" connectNulls />
                    <Area type="monotone" dataKey="lowerBound" stroke="none" fill="#020617" name="Lower Confidence" connectNulls />
                    
                    <Line type="monotone" dataKey="historical" stroke="#0ea5e9" strokeWidth={3} name="Historical Coverage" dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
                    <Line type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={4} strokeDasharray="5 5" name="AI Forecast" dot={{ r: 5, fill: '#a855f7', strokeWidth: 2, stroke: '#020617' }} activeDot={{ r: 8 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
