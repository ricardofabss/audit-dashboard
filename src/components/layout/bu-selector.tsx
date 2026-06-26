"use client";

import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { businessUnits, sectorMeta, getAllSectors } from "@/lib/business-units";
import { useBusinessUnitStore, useActiveBU } from "@/hooks/use-business-unit";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export function BUSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeBU = useActiveBU();
  const setActiveBU = useBusinessUnitStore((s) => s.setActiveBU);
  const { language } = useTranslation();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sectors = getAllSectors();

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition",
          "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white",
          open && "border-cyan-300/30 bg-cyan-300/5"
        )}
      >
        {activeBU ? (
          <>
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
              style={{ backgroundColor: activeBU.color + "30", color: activeBU.color }}
            >
              {activeBU.shortName.substring(0, 2)}
            </span>
            <span className="max-w-[140px] truncate text-xs font-medium">{activeBU.name}</span>
          </>
        ) : (
          <>
            <Layers className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-medium">
              {language === "id" ? "Semua Unit Bisnis" : "All Business Units"}
            </span>
          </>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-white/10 bg-[#0b1739]/98 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Consolidated Option */}
            <button
              onClick={() => { setActiveBU(null); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                "hover:bg-white/[0.06]",
                !activeBU && "bg-cyan-300/5"
              )}
            >
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-300/10 text-cyan-300">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">
                  {language === "id" ? "Semua Unit Bisnis" : "All Business Units"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {language === "id" ? "Tampilan konsolidasi holding" : "Consolidated holding view"}
                </div>
              </div>
              {!activeBU && <Check className="h-4 w-4 text-cyan-400 shrink-0" />}
            </button>

            <div className="border-t border-white/5" />

            {/* Sectors & BUs */}
            <div className="max-h-[360px] overflow-y-auto scrollbar-thin py-1">
              {sectors.map((sector) => {
                const meta = sectorMeta[sector];
                const sectorBUs = businessUnits.filter(bu => bu.sector === sector);

                return (
                  <div key={sector}>
                    {/* Sector Header */}
                    <div className="flex items-center gap-2 px-4 py-2">
                      <span className="text-sm">{meta.icon}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                        {language === "id" ? meta.labelId : meta.label}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">({sectorBUs.length})</span>
                    </div>

                    {/* BU Items */}
                    {sectorBUs.map((bu) => {
                      const isActive = activeBU?.id === bu.id;
                      return (
                        <button
                          key={bu.id}
                          onClick={() => { setActiveBU(bu.id); setOpen(false); }}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                            "hover:bg-white/[0.06]",
                            isActive && "bg-white/[0.04]"
                          )}
                        >
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: bu.color + "20", color: bu.color }}
                          >
                            {bu.shortName}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-200 truncate">{bu.name}</div>
                            <div className="text-[10px] text-slate-500">{bu.brand}</div>
                          </div>
                          {isActive && <Check className="h-4 w-4 text-cyan-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
