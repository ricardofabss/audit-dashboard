import type { SectorType, BusinessUnit, AnomalyRuleCode } from "@/types/risk-intelligence";

// ─── Business Unit Registry ──────────────────────────────────────────

export const businessUnits: BusinessUnit[] = [
  // ── Pergadaian ─────────────────────────────────────────────────────
  {
    id: "bu-pg-gmn", code: "PG-GMN",
    name: "Gadai Mas Nusantara", sector: "PERGADAIAN",
    brand: "Emas & Elektronik", color: "#f59e0b", shortName: "GMN",
  },
  {
    id: "bu-pg-gms", code: "PG-GMS",
    name: "Gadai Mulia Sejahtera", sector: "PERGADAIAN",
    brand: "Emas & Elektronik", color: "#eab308", shortName: "GMS",
  },

  // ── Multifinance ───────────────────────────────────────────────────
  {
    id: "bu-mf-smf", code: "MF-SMF",
    name: "Smart Multi Finance", sector: "MULTIFINANCE",
    brand: "Leasing Kendaraan", color: "#06b6d4", shortName: "SMF",
  },

  // ── Otomotif ───────────────────────────────────────────────────────
  {
    id: "bu-ot-gma", code: "OT-GMA",
    name: "Graha Mulia Auto", sector: "OTOMOTIF",
    brand: "Toyota", color: "#ef4444", shortName: "GMA",
  },
  {
    id: "bu-ot-dsa", code: "OT-DSA",
    name: "Daihatsu Serba Mulia Auto", sector: "OTOMOTIF",
    brand: "Daihatsu", color: "#dc2626", shortName: "DSA",
  },
  {
    id: "bu-ot-ysa", code: "OT-YSA",
    name: "Yamaha Serba Mulia Auto", sector: "OTOMOTIF",
    brand: "Yamaha", color: "#2563eb", shortName: "YSA",
  },
  {
    id: "bu-ot-svm", code: "OT-SVM",
    name: "Sukses Vista Motor", sector: "OTOMOTIF",
    brand: "Vespa", color: "#16a34a", shortName: "SVM",
  },
  {
    id: "bu-ot-ksm", code: "OT-KSM",
    name: "Kawasaki Super Sukses Motor", sector: "OTOMOTIF",
    brand: "Kawasaki", color: "#22c55e", shortName: "KSM",
  },
  {
    id: "bu-ot-sma", code: "OT-SMA",
    name: "Smart Mulia Abadi", sector: "OTOMOTIF",
    brand: "Vespa", color: "#059669", shortName: "SMA",
  },
  {
    id: "bu-ot-ssa", code: "OT-SSA",
    name: "Super Sukses Anugerah", sector: "OTOMOTIF",
    brand: "TVS", color: "#7c3aed", shortName: "SSA",
  },
];

// ─── Sector Metadata ─────────────────────────────────────────────────

export type SectorMeta = {
  sector: SectorType;
  label: string;
  labelId: string;
  icon: string;
  color: string;
  ruleCodes: AnomalyRuleCode[];
  entityLabels: {
    customer: { en: string; id: string };
    branch: { en: string; id: string };
    officer: { en: string; id: string };
  };
};

export const sectorMeta: Record<SectorType, SectorMeta> = {
  PERGADAIAN: {
    sector: "PERGADAIAN",
    label: "Pawnshop",
    labelId: "Pergadaian",
    icon: "🏦",
    color: "#f59e0b",
    ruleCodes: ["A01", "A02", "A03", "A04", "A05", "A06", "A07"],
    entityLabels: {
      customer: { en: "Customer", id: "Nasabah" },
      branch: { en: "Outlet", id: "Outlet/Cabang" },
      officer: { en: "Appraiser", id: "Penaksir" },
    },
  },
  MULTIFINANCE: {
    sector: "MULTIFINANCE",
    label: "Multifinance",
    labelId: "Pembiayaan",
    icon: "💰",
    color: "#06b6d4",
    ruleCodes: ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09"],
    entityLabels: {
      customer: { en: "Debtor", id: "Debitur" },
      branch: { en: "Branch", id: "Cabang" },
      officer: { en: "Account Officer", id: "Account Officer" },
    },
  },
  OTOMOTIF: {
    sector: "OTOMOTIF",
    label: "Automotive",
    labelId: "Otomotif",
    icon: "🚗",
    color: "#ef4444",
    ruleCodes: ["O01", "O02", "O03", "O04", "O05", "O06", "O07", "O08", "O09"],
    entityLabels: {
      customer: { en: "Buyer", id: "Pembeli" },
      branch: { en: "Dealer/Showroom", id: "Dealer/Showroom" },
      officer: { en: "Sales Officer", id: "Sales/Counter" },
    },
  },
};

// ─── Convenience Accessors ───────────────────────────────────────────

export const getBUsBySecrtor = (sector: SectorType): BusinessUnit[] =>
  businessUnits.filter(bu => bu.sector === sector);

export const getBUByCode = (code: string): BusinessUnit | undefined =>
  businessUnits.find(bu => bu.code === code);

export const getBUById = (id: string): BusinessUnit | undefined =>
  businessUnits.find(bu => bu.id === id);

export const getSectorForBU = (buId: string): SectorType | undefined =>
  businessUnits.find(bu => bu.id === buId)?.sector;

export const getAllSectors = (): SectorType[] => ["PERGADAIAN", "MULTIFINANCE", "OTOMOTIF"];

export const getRuleCodesForSector = (sector: SectorType): AnomalyRuleCode[] =>
  sectorMeta[sector].ruleCodes;
