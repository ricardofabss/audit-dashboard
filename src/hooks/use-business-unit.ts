"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SectorType, BusinessUnit } from "@/types/risk-intelligence";
import { businessUnits, getSectorForBU } from "@/lib/business-units";

type BusinessUnitState = {
  /** Currently selected BU id, or null for consolidated (all BUs) view */
  activeBUId: string | null;
  setActiveBU: (buId: string | null) => void;
};

export const useBusinessUnitStore = create<BusinessUnitState>()(
  persist(
    (set) => ({
      activeBUId: null, // default = consolidated
      setActiveBU: (buId) => set({ activeBUId: buId }),
    }),
    {
      name: "auditsphere-active-bu",
      skipHydration: true,
    }
  )
);

// ─── Derived Hooks ──────────────────────────────────────────────────

/** Returns the active BU object, or null for consolidated view */
export function useActiveBU(): BusinessUnit | null {
  const id = useBusinessUnitStore((s) => s.activeBUId);
  if (!id) return null;
  return businessUnits.find((bu) => bu.id === id) ?? null;
}

/** Returns the active sector, or null for consolidated */
export function useActiveSector(): SectorType | null {
  const id = useBusinessUnitStore((s) => s.activeBUId);
  if (!id) return null;
  return getSectorForBU(id) ?? null;
}

/** Returns true if the view is consolidated (all BUs) */
export function useIsConsolidated(): boolean {
  return useBusinessUnitStore((s) => s.activeBUId === null);
}
