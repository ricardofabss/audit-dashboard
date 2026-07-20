import type {
  AnomalyRule,
  AnomalyDetection,
  CustomerRiskProfile,
  BranchRiskProfile,
  OfficerRiskProfile,
  RiskScoreSnapshot,
  RiskInsight,
  RiskTrendDataPoint,
  AnomalyTrendDataPoint,
  AnomalyRuleCode,
  RiskLevel,
  AnomalyStatus,
  RiskScoreBreakdown,
  SectorType,
  RiskMockDataSet,
} from "@/types/risk-intelligence";
import { businessUnits, sectorMeta } from "@/lib/business-units";

// ─── Seeded PRNG (deterministic across SSR and client) ────────────────
// Uses mulberry32 algorithm for consistent output given the same seed.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _seededRng = mulberry32(42);

/** Reset the PRNG to a known state (call before generating a dataset) */
function resetRng(seed = 42) {
  _seededRng = mulberry32(seed);
}

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(_seededRng() * arr.length)];

const randomBetween = (min: number, max: number) =>
  Math.floor(min + _seededRng() * (max - min + 1));

let _idCounter = 1000;
let _idPrefix = "";
const uid = () => `RI-${_idPrefix}${_idCounter++}`;

const formatDate = (d: Date) => d.toISOString().split("T")[0];

// Use a fixed reference date to avoid SSR/client date mismatch
const _refDate = new Date("2026-07-15T00:00:00Z");

const daysAgo = (n: number) => {
  const d = new Date(_refDate);
  d.setDate(d.getDate() - n);
  return d;
};

const monthLabel = (monthsAgo: number) => {
  const d = new Date(_refDate);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleString("en", { month: "short", year: "numeric" });
};

// ─── Sector-Specific Reference Data ──────────────────────────────────

const pergadaianOutlets = [
  { code: "PG-OL-001", name: "Outlet Menteng", branch: "Cabang Jakarta Pusat", region: "DKI Jakarta", area: "Jabodetabek" },
  { code: "PG-OL-002", name: "Outlet Kemang", branch: "Cabang Jakarta Selatan", region: "DKI Jakarta", area: "Jabodetabek" },
  { code: "PG-OL-003", name: "Outlet Kelapa Gading", branch: "Cabang Jakarta Utara", region: "DKI Jakarta", area: "Jabodetabek" },
  { code: "PG-OL-004", name: "Outlet Bekasi Timur", branch: "Cabang Bekasi", region: "Jawa Barat", area: "Jabodetabek" },
  { code: "PG-OL-005", name: "Outlet Depok Margonda", branch: "Cabang Depok", region: "Jawa Barat", area: "Jabodetabek" },
  { code: "PG-OL-006", name: "Outlet Bandung Dago", branch: "Cabang Bandung", region: "Jawa Barat", area: "Jawa Barat" },
  { code: "PG-OL-007", name: "Outlet Semarang Simpang Lima", branch: "Cabang Semarang", region: "Jawa Tengah", area: "Jawa Tengah" },
  { code: "PG-OL-008", name: "Outlet Surabaya Tunjungan", branch: "Cabang Surabaya", region: "Jawa Timur", area: "Jawa Timur" },
  { code: "PG-OL-009", name: "Outlet Medan Merdeka", branch: "Cabang Medan", region: "Sumatera Utara", area: "Sumatera" },
  { code: "PG-OL-010", name: "Outlet Makassar Pettarani", branch: "Cabang Makassar", region: "Sulawesi Selatan", area: "Sulawesi" },
  { code: "PG-OL-011", name: "Outlet Denpasar Renon", branch: "Cabang Denpasar", region: "Bali", area: "Bali & NT" },
  { code: "PG-OL-012", name: "Outlet Tangerang BSD", branch: "Cabang Tangerang", region: "Banten", area: "Jabodetabek" },
  { code: "PG-OL-013", name: "Outlet Yogyakarta Malioboro", branch: "Cabang Yogyakarta", region: "DIY", area: "Jawa Tengah" },
  { code: "PG-OL-014", name: "Outlet Bogor Pajajaran", branch: "Cabang Bogor", region: "Jawa Barat", area: "Jabodetabek" },
  { code: "PG-OL-015", name: "Outlet Palembang Sudirman", branch: "Cabang Palembang", region: "Sumatera Selatan", area: "Sumatera" },
];

const multifinanceOutlets = [
  { code: "MF-BR-001", name: "Cabang Jakarta Pusat", branch: "Area DKI Jakarta", region: "DKI Jakarta", area: "Jabodetabek" },
  { code: "MF-BR-002", name: "Cabang Jakarta Selatan", branch: "Area DKI Jakarta", region: "DKI Jakarta", area: "Jabodetabek" },
  { code: "MF-BR-003", name: "Cabang Bekasi", branch: "Area Jabodetabek", region: "Jawa Barat", area: "Jabodetabek" },
  { code: "MF-BR-004", name: "Cabang Bandung", branch: "Area Jawa Barat", region: "Jawa Barat", area: "Jawa Barat" },
  { code: "MF-BR-005", name: "Cabang Semarang", branch: "Area Jawa Tengah", region: "Jawa Tengah", area: "Jawa Tengah" },
  { code: "MF-BR-006", name: "Cabang Surabaya", branch: "Area Jawa Timur", region: "Jawa Timur", area: "Jawa Timur" },
  { code: "MF-BR-007", name: "Cabang Medan", branch: "Area Sumatera", region: "Sumatera Utara", area: "Sumatera" },
  { code: "MF-BR-008", name: "Cabang Makassar", branch: "Area Sulawesi", region: "Sulawesi Selatan", area: "Sulawesi" },
  { code: "MF-BR-009", name: "Cabang Denpasar", branch: "Area Bali & NT", region: "Bali", area: "Bali & NT" },
  { code: "MF-BR-010", name: "Cabang Tangerang", branch: "Area Jabodetabek", region: "Banten", area: "Jabodetabek" },
];

const otomotifOutlets = [
  { code: "OT-DL-001", name: "Showroom Kelapa Gading", branch: "Area Jakarta", region: "DKI Jakarta", area: "Jabodetabek" },
  { code: "OT-DL-002", name: "Showroom Pondok Indah", branch: "Area Jakarta", region: "DKI Jakarta", area: "Jabodetabek" },
  { code: "OT-DL-003", name: "Showroom Bekasi", branch: "Area Jabodetabek", region: "Jawa Barat", area: "Jabodetabek" },
  { code: "OT-DL-004", name: "Showroom Bandung Pasteur", branch: "Area Jawa Barat", region: "Jawa Barat", area: "Jawa Barat" },
  { code: "OT-DL-005", name: "Showroom Semarang", branch: "Area Jawa Tengah", region: "Jawa Tengah", area: "Jawa Tengah" },
  { code: "OT-DL-006", name: "Showroom Surabaya HR Muhammad", branch: "Area Jawa Timur", region: "Jawa Timur", area: "Jawa Timur" },
  { code: "OT-DL-007", name: "Showroom Medan", branch: "Area Sumatera", region: "Sumatera Utara", area: "Sumatera" },
  { code: "OT-DL-008", name: "Showroom Makassar", branch: "Area Sulawesi", region: "Sulawesi Selatan", area: "Sulawesi" },
  { code: "OT-DL-009", name: "Showroom Yogyakarta", branch: "Area Jawa Tengah", region: "DIY", area: "Jawa Tengah" },
  { code: "OT-DL-010", name: "Showroom Malang", branch: "Area Jawa Timur", region: "Jawa Timur", area: "Jawa Timur" },
  { code: "OT-DL-011", name: "Showroom Tangerang", branch: "Area Jabodetabek", region: "Banten", area: "Jabodetabek" },
  { code: "OT-DL-012", name: "Showroom Denpasar", branch: "Area Bali & NT", region: "Bali", area: "Bali & NT" },
];

const getOutletsForSector = (sector: SectorType) => {
  switch (sector) {
    case "PERGADAIAN": return pergadaianOutlets;
    case "MULTIFINANCE": return multifinanceOutlets;
    case "OTOMOTIF": return otomotifOutlets;
  }
};

const customerNames = [
  "Budi Santoso", "Siti Rahayu", "Ahmad Wijaya", "Dewi Lestari", "Agus Prabowo",
  "Rina Kartika", "Hendra Gunawan", "Yanti Susanto", "Fajar Hidayat", "Lina Permata",
  "Rudi Hartono", "Mega Sari", "Bambang Suryadi", "Novi Anggraini", "Doni Pratama",
  "Wulan Indah", "Eko Setiawan", "Maya Kusuma", "Surya Dharma", "Putri Handayani",
  "Joko Widodo", "Tika Ratnasari", "Arif Budiman", "Nurul Hikmah", "Wahyu Firmansyah",
  "Indri Amalia", "Rizky Maulana", "Sari Dewanti", "Galih Prasetyo", "Ani Yulianti",
  "Hendro Wibowo", "Fitri Nurjanah", "Bayu Adhitya", "Lestari Ningrum", "Irwan Subekti",
  "Dina Fitriani", "Yoga Nugroho", "Ratna Susilowati", "Taufik Ismail", "Ayu Puspitasari",
];

const officerNamesBySetor: Record<SectorType, string[]> = {
  PERGADAIAN: [
    "Ir. Surya Darma, M.M.", "Dra. Amelia Putri", "Anton Sugiarto, S.E.", "Ratih Kumala, S.Ak.",
    "Herry Wibowo, M.Ak.", "Lina Marlina, S.E.", "Bambang Kuncoro, S.H.", "Dewi Anggraini, M.M.",
    "Rudi Hermawan, S.E.", "Maya Indrawati, S.Ak.", "Eko Prasetyo, M.M.", "Sari Ratnawati, S.E.",
    "Agung Nugroho, S.H.", "Fitria Handayani, M.Ak.", "Yusuf Hidayat, S.E.",
  ],
  MULTIFINANCE: [
    "Denny Firmansyah, S.E.", "Rani Maharani, M.M.", "Agus Kurniawan, S.Ak.", "Sinta Puspita, S.E.",
    "Bagus Hardianto, M.M.", "Lia Permata, S.E.", "Ronal Siagian, S.H.", "Winda Sari, M.Ak.",
    "Yunus Affandi, S.E.", "Dita Anggraini, M.M.",
  ],
  OTOMOTIF: [
    "Rico Prasetya", "Andi Saputra", "Mega Lestari", "Toni Wijaya", "Sari Kurniasih",
    "Benny Aditya", "Dwi Rahayu", "Fauzan Akbar", "Nita Permata", "Galih Hermawan",
    "Rina Setiawan", "Lukman Arief",
  ],
};

const officerPositionsBySector: Record<SectorType, string[]> = {
  PERGADAIAN: ["Branch Manager", "Senior Appraiser", "Appraiser", "Teller", "Customer Service", "Operational Supervisor"],
  MULTIFINANCE: ["Branch Manager", "Senior Account Officer", "Account Officer", "Credit Analyst", "Collection Officer", "Admin"],
  OTOMOTIF: ["Kepala Cabang", "Sales Supervisor", "Senior Sales", "Sales Counter", "Service Advisor", "Parts Manager"],
};

// ─── Anomaly Rules per Sector ────────────────────────────────────────

function getPergadaianRules(): AnomalyRule[] {
  return [
    {
      id: uid(), code: "A01", sector: "PERGADAIAN",
      name: "High Frequency Pawning",
      nameId: "Frekuensi Gadai Tinggi",
      description: "Customer performs more than 5 pawn transactions within 1 month",
      descriptionId: "Nasabah melakukan gadai lebih dari 5x dalam 1 bulan",
      riskWeight: 10, thresholds: { maxTransactions: 5, windowDays: 30 },
      isActive: true, category: "FREQUENCY", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "A02", sector: "PERGADAIAN",
      name: "Pawn Duration Check (Short Aging Large Loan)",
      nameId: "Hitung Aging Gadai Besar",
      description: "Pawn aging < 15 days with loan amount > IDR 5,000,000 (disbursement to settlement date, or current date if active)",
      descriptionId: "Aging gadai < 15 hari dengan uang pinjaman > Rp 5.000.000 (selisih tanggal pencairan ke pelunasan/tanggal aktif jika belum lunas)",
      riskWeight: 15, thresholds: { maxAgingDays: 15, minLoanAmount: 5000000 },
      isActive: true, category: "AMOUNT", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "A03", sector: "PERGADAIAN",
      name: "Unusual Top-Up Renewal Aging",
      nameId: "Perpanjangan Top-Up Aging Tidak Wajar",
      description: "Top-up renewal transaction with aging below 15 days or above 135 days",
      descriptionId: "Transaksi perpanjangan dengan status Top Up dengan aging gadai di bawah 15 hari atau di atas 135 hari",
      riskWeight: 20, thresholds: { minAgingDays: 15, maxAgingDays: 135 },
      isActive: true, category: "PATTERN", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "A04", sector: "PERGADAIAN",
      name: "Extreme LTV Increase on Top-Up",
      nameId: "Kenaikan LTV Ekstrim saat Top-Up",
      description: "Top-up renewal transaction with previous LTV < 70% and current LTV > 95%",
      descriptionId: "Transaksi perpanjangan Top Up dengan LTV sebelumnya di bawah 70% menjadi di atas 95%",
      riskWeight: 12, thresholds: { prevMaxLtv: 70, currentMinLtv: 95 },
      isActive: true, category: "AMOUNT", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "A05", sector: "PERGADAIAN",
      name: "Early Settlement (Lunas Tebus Only)",
      nameId: "Pelunasan Cepat (Hanya Lunas Tebus)",
      description: "Early settlement (Lunas Tebus only) < 3 days from disbursement date",
      descriptionId: "Transaksi pelunasan tebus dalam jangka waktu kurang dari 3 hari dari tanggal pencairan",
      riskWeight: 8, thresholds: { minSettlementDays: 3 },
      isActive: true, category: "PATTERN", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "A06", sector: "PERGADAIAN",
      name: "Off-Hours Transaction",
      nameId: "Transaksi di Luar Jam Operasional",
      description: "Transaction processed outside typical business hours (before 8 AM or after 8 PM)",
      descriptionId: "Transaksi yang dilakukan di luar jam operasional (sebelum pukul 08:00 atau setelah pukul 20:00)",
      riskWeight: 25, thresholds: { startHour: 8, endHour: 20 },
      isActive: true, category: "TIMING", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "A07", sector: "PERGADAIAN",
      name: "Cross-Branch Transactions",
      nameId: "Transaksi Lintas Cabang",
      description: "Customer performs transactions across different branch locations",
      descriptionId: "Nasabah (CIF) melakukan transaksi di beberapa cabang/outlet yang berbeda",
      riskWeight: 18, thresholds: { minBranches: 2 },
      isActive: true, category: "PATTERN", createdAt: formatDate(daysAgo(180)),
    },
  ];
}

function getMultifinanceRules(): AnomalyRule[] {
  return [
    {
      id: uid(), code: "M01", sector: "MULTIFINANCE",
      name: "Overdue Installment Cluster",
      nameId: "Klaster Angsuran Tertunggak",
      description: "Debtor has > 3 consecutive overdue installments",
      descriptionId: "Nasabah > 3 angsuran tertunggak berturut-turut",
      riskWeight: 15, thresholds: { maxOverdueConsecutive: 3 },
      isActive: true, category: "CREDIT", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "M02", sector: "MULTIFINANCE",
      name: "Early Termination Pattern",
      nameId: "Pola Pelunasan Dipercepat",
      description: "Early settlement < 3 months from disbursement",
      descriptionId: "Pelunasan dipercepat < 3 bulan dari pencairan",
      riskWeight: 10, thresholds: { minMonthsBeforeTermination: 3 },
      isActive: true, category: "PATTERN", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "M03", sector: "MULTIFINANCE",
      name: "Collateral Value Discrepancy",
      nameId: "Diskrepansi Nilai Jaminan",
      description: "Vehicle collateral value > 20% below market price",
      descriptionId: "Nilai jaminan kendaraan > 20% di bawah harga pasar",
      riskWeight: 20, thresholds: { maxDiscrepancyPercent: 20 },
      isActive: true, category: "COLLATERAL", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "M04", sector: "MULTIFINANCE",
      name: "Dealer Concentration Risk",
      nameId: "Risiko Konsentrasi Dealer",
      description: "Single dealer > 40% of branch financing volume",
      descriptionId: "Satu dealer > 40% volume pembiayaan cabang",
      riskWeight: 25, thresholds: { maxDealerPercent: 40 },
      isActive: true, category: "CONCENTRATION", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "M05", sector: "MULTIFINANCE",
      name: "Fictitious Customer Pattern",
      nameId: "Pola Nasabah Fiktif",
      description: "> 3 customers with similar address/phone in 30 days",
      descriptionId: "> 3 nasabah alamat/telepon serupa dalam 30 hari",
      riskWeight: 22, thresholds: { maxSimilarCustomers: 3, windowDays: 30 },
      isActive: true, category: "PATTERN", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "M06", sector: "MULTIFINANCE",
      name: "Rapid Credit Approval",
      nameId: "Persetujuan Kredit Cepat",
      description: "Credit approval < 2 hours from application (bypass assessment)",
      descriptionId: "Approval < 2 jam dari pengajuan (bypass assessment)",
      riskWeight: 18, thresholds: { maxApprovalHours: 2 },
      isActive: true, category: "COMPLIANCE", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "M07", sector: "MULTIFINANCE",
      name: "Insurance Claim Anomaly",
      nameId: "Anomali Klaim Asuransi",
      description: "Insurance claim < 90 days from disbursement",
      descriptionId: "Klaim asuransi < 90 hari dari pencairan",
      riskWeight: 12, thresholds: { minClaimDays: 90 },
      isActive: true, category: "PATTERN", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "M08", sector: "MULTIFINANCE",
      name: "Excessive Top-Up",
      nameId: "Top-Up Berlebihan",
      description: "> 2 top-ups within 6 months on same contract",
      descriptionId: "> 2 top-up dalam 6 bulan pada kontrak yang sama",
      riskWeight: 8, thresholds: { maxTopUps: 2, windowMonths: 6 },
      isActive: true, category: "FREQUENCY", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "M09", sector: "MULTIFINANCE",
      name: "Cross-Dealer Pattern",
      nameId: "Pola Lintas Dealer",
      description: "Same customer applies at 3+ dealers within 14 days",
      descriptionId: "Nasabah sama mengajukan di 3+ dealer dalam 14 hari",
      riskWeight: 15, thresholds: { minDealers: 3, windowDays: 14 },
      isActive: true, category: "PATTERN", createdAt: formatDate(daysAgo(180)),
    },
  ];
}

function getOtomotifRules(): AnomalyRule[] {
  return [
    {
      id: uid(), code: "O01", sector: "OTOMOTIF",
      name: "Pending Sales Indication",
      nameId: "Indikasi Pending Sales",
      description: "> 50% sales occur in the last 7 days of the month",
      descriptionId: "> 50% penjualan terjadi di 7 hari terakhir bulan berjalan",
      riskWeight: 15, thresholds: { minRatio: 0.5 },
      isActive: true, category: "TIMING", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "O02", sector: "OTOMOTIF",
      name: "Leasing Dominance",
      nameId: "Dominasi Leasing pada Sales",
      description: "> 60% credit sales dominated by 1 leasing company",
      descriptionId: "> 60% penjualan kredit dikuasai oleh 1 perusahaan leasing",
      riskWeight: 20, thresholds: { maxDominanceRatio: 0.6 },
      isActive: true, category: "CONCENTRATION", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "O04", sector: "OTOMOTIF",
      name: "Mechanic Inequality",
      nameId: "Ketimpangan Mekanik",
      description: "Mechanic performs > 50% of branch workshop orders",
      descriptionId: "Mekanik mengerjakan > 50% seluruh WO bengkel di cabangnya",
      riskWeight: 22, thresholds: { maxWorkloadRatio: 0.5 },
      isActive: true, category: "CONCENTRATION", createdAt: formatDate(daysAgo(180)),
    },
    {
      id: uid(), code: "O05", sector: "OTOMOTIF",
      name: "Identity Fraud (Different STNK)",
      nameId: "Indikasi Penipuan Identitas",
      description: "Salesperson has > 3 sales with different STNK and buyer names",
      descriptionId: "Sales memiliki > 3 penjualan dengan nama STNK berbeda dari pembeli",
      riskWeight: 25, thresholds: { maxNameMismatch: 3 },
      isActive: true, category: "COMPLIANCE", createdAt: formatDate(daysAgo(180)),
    },
  ];
}

function getRulesForSector(sector: SectorType): AnomalyRule[] {
  switch (sector) {
    case "PERGADAIAN": return getPergadaianRules();
    case "MULTIFINANCE": return getMultifinanceRules();
    case "OTOMOTIF": return getOtomotifRules();
  }
}

// ─── Generic Data Generators ─────────────────────────────────────────

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function generateBreakdown(rules: AnomalyRule[], anomalyCount: number): RiskScoreBreakdown {
  const activeRules = rules.slice(0, randomBetween(1, Math.min(anomalyCount || 1, rules.length)));
  const items = activeRules.map(rule => {
    const occ = randomBetween(1, 8);
    return {
      ruleCode: rule.code,
      ruleName: rule.name,
      occurrences: occ,
      weightedScore: Math.min(100, rule.riskWeight * occ),
      lastDetected: formatDate(daysAgo(randomBetween(1, 60))),
    };
  });
  const totalRaw = items.reduce((s, i) => s + i.weightedScore, 0);
  return {
    items,
    totalRawScore: totalRaw,
    normalizedScore: Math.min(100, Math.round(totalRaw / Math.max(1, items.length))),
    velocityFactor: +(_seededRng() * 1.5 + 0.5).toFixed(2),
    decayApplied: _seededRng() > 0.5,
  };
}

function generateDataForBU(buId: string, sector: SectorType): RiskMockDataSet {
  // Seed is derived from buId so each BU gets deterministic but unique data
  const seed = buId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 31 + 42;
  resetRng(seed);
  _idCounter = 1000;
  _idPrefix = buId + "-";

  const rules = getRulesForSector(sector);
  const outlets = getOutletsForSector(sector);
  const officers = officerNamesBySetor[sector];
  const positions = officerPositionsBySector[sector];
  const statuses: AnomalyStatus[] = ["DETECTED", "CONFIRMED", "INVESTIGATING", "DISMISSED", "RESOLVED"];
  const statusWeights = [35, 25, 20, 10, 10];

  // ─── Anomaly Detections ──────────────────────────────────────
  const detections: AnomalyDetection[] = [];
  for (let i = 0; i < 200; i++) {
    const rule = pickRandom(rules);
    const outlet = pickRandom(outlets);
    const entityType = pickRandom(["CUSTOMER", "BRANCH", "OFFICER"] as const);
    const customer = pickRandom(customerNames);
    const officer = pickRandom(officers);
    const daysBack = randomBetween(1, 180);

    const rand = _seededRng() * 100;
    let cumulative = 0;
    let status: AnomalyStatus = "DETECTED";
    for (let s = 0; s < statuses.length; s++) {
      cumulative += statusWeights[s];
      if (rand <= cumulative) { status = statuses[s]; break; }
    }

    const entityName = entityType === "CUSTOMER" ? customer : entityType === "OFFICER" ? officer : outlet.name;
    const entityId = entityType === "CUSTOMER"
      ? `CIF-${String(randomBetween(10000, 99999))}`
      : entityType === "OFFICER"
      ? `OFF-${String(randomBetween(100, 999))}`
      : outlet.code;

    detections.push({
      id: uid(), ruleCode: rule.code, ruleName: rule.name,
      sector, businessUnitId: buId,
      entityType, entityId, entityName,
      outletCode: outlet.code, outletName: outlet.name, branchName: outlet.branch,
      riskScore: randomBetween(rule.riskWeight, Math.min(100, rule.riskWeight * 5)),
      riskWeight: rule.riskWeight, status,
      detectedAt: formatDate(daysAgo(daysBack)),
      resolvedAt: status === "RESOLVED" ? formatDate(daysAgo(randomBetween(0, daysBack))) : undefined,
      metadata: { transactionCount: randomBetween(1, 20), totalAmount: randomBetween(500000, 50000000) },
      description: `${rule.name} detected for ${entityName} at ${outlet.name}`,
    });
  }
  detections.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

  // ─── Customer Risk Profiles ──────────────────────────────────
  const custNames = customerNames.slice(0, 30 + randomBetween(0, 10));
  const customerProfiles: CustomerRiskProfile[] = custNames.map((name, idx) => {
    const outlet = outlets[idx % outlets.length];
    const totalScore = randomBetween(5, 98);
    const anomalyCount = randomBetween(0, 15);
    const trend = randomBetween(-20, 25);
    return {
      id: uid(), sector, businessUnitId: buId,
      customerId: `CIF-${String(10000 + idx)}`, customerName: name,
      cifNumber: `CIF-${String(10000 + idx)}`,
      primaryOutlet: outlet.name, primaryBranch: outlet.branch,
      totalScore, riskLevel: riskLevelFromScore(totalScore),
      anomalyCount, activeAnomalies: Math.min(anomalyCount, randomBetween(0, 6)),
      breakdown: generateBreakdown(rules, anomalyCount),
      transactionCount: randomBetween(2, 120),
      totalLoanAmount: randomBetween(1000000, 500000000),
      firstTransactionDate: formatDate(daysAgo(randomBetween(180, 720))),
      lastTransactionDate: formatDate(daysAgo(randomBetween(0, 30))),
      trend, trendDirection: trend > 3 ? "UP" : trend < -3 ? "DOWN" : "STABLE",
      updatedAt: formatDate(daysAgo(0)),
    };
  });

  // ─── Branch Risk Profiles ────────────────────────────────────
  const branchProfiles: BranchRiskProfile[] = outlets.map(outlet => {
    const totalScore = randomBetween(10, 95);
    const anomalyCount = randomBetween(2, 40);
    const trend = randomBetween(-15, 20);
    return {
      id: uid(), sector, businessUnitId: buId,
      outletCode: outlet.code, outletName: outlet.name,
      branchName: outlet.branch, regionName: outlet.region, areaName: outlet.area,
      totalScore, riskLevel: riskLevelFromScore(totalScore),
      anomalyCount, activeAnomalies: Math.min(anomalyCount, randomBetween(1, 12)),
      customerCount: randomBetween(50, 800), highRiskCustomerCount: randomBetween(2, 30),
      breakdown: generateBreakdown(rules, anomalyCount),
      transactionVolume: randomBetween(200, 5000),
      totalPortfolioValue: randomBetween(500000000, 50000000000),
      anomalyDensity: +(randomBetween(5, 80) / 10).toFixed(1),
      trend, trendDirection: trend > 3 ? "UP" : trend < -3 ? "DOWN" : "STABLE",
      updatedAt: formatDate(daysAgo(0)),
      avgPawnDuration: randomBetween(30, 120),
    };
  });

  // ─── Officer Risk Profiles ───────────────────────────────────
  const officerProfiles: OfficerRiskProfile[] = officers.map((name, idx) => {
    const outlet = outlets[idx % outlets.length];
    const totalScore = randomBetween(5, 88);
    const anomalyCount = randomBetween(0, 12);
    const trend = randomBetween(-10, 15);
    return {
      id: uid(), sector, businessUnitId: buId,
      officerId: `OFF-${String(100 + idx)}`, officerName: name,
      position: positions[idx % positions.length],
      outletCode: outlet.code, outletName: outlet.name, branchName: outlet.branch,
      totalScore, riskLevel: riskLevelFromScore(totalScore),
      anomalyCount, activeAnomalies: Math.min(anomalyCount, randomBetween(0, 5)),
      breakdown: generateBreakdown(rules, anomalyCount),
      handledTransactions: randomBetween(50, 1200),
      supervisoryGapScore: randomBetween(0, 40),
      trend, trendDirection: trend > 3 ? "UP" : trend < -3 ? "DOWN" : "STABLE",
      updatedAt: formatDate(daysAgo(0)),
    };
  });

  // ─── Risk Score History ──────────────────────────────────────
  const history: RiskScoreSnapshot[] = [];
  for (let m = 11; m >= 0; m--) {
    const period = monthLabel(m);
    const snapshotDate = formatDate(daysAgo(m * 30));
    for (const outlet of outlets) {
      const score = randomBetween(15, 92);
      history.push({
        id: uid(), sector, businessUnitId: buId,
        entityType: "BRANCH", entityId: outlet.code, entityName: outlet.name,
        score, riskLevel: riskLevelFromScore(score),
        anomalyCount: randomBetween(1, 25), snapshotDate, periodLabel: period,
      });
    }
  }

  // ─── Risk Insights ───────────────────────────────────────────
  const insights: RiskInsight[] = [];
  for (let i = 0; i < 15; i++) {
    const outlet = pickRandom(outlets);
    const customer = pickRandom(custNames);
    const severity = pickRandom(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const);
    const category = pickRandom(["TREND", "CLUSTER", "SUMMARY", "RECOMMENDATION", "ALERT"] as const);
    const rule = pickRandom(rules);
    insights.push({
      id: uid(), sector, businessUnitId: buId,
      entityType: pickRandom(["CUSTOMER", "BRANCH", "OFFICER", "SYSTEM"] as const),
      entityId: pickRandom([`CIF-${randomBetween(10000, 10039)}`, outlet.code]),
      entityName: pickRandom([customer, outlet.name]),
      severity, category,
      confidence: randomBetween(60, 98),
      isRead: _seededRng() > 0.6, actionTaken: _seededRng() > 0.8,
      generatedAt: formatDate(daysAgo(randomBetween(0, 30))),
      insightText: `${rule.name} pattern analysis for ${customer} at ${outlet.name} — ${severity.toLowerCase()} risk with ${randomBetween(1, 15)} occurrences.`,
      insightTextId: `Analisis pola ${rule.nameId} untuk ${customer} di ${outlet.name} — risiko ${severity.toLowerCase()} dengan ${randomBetween(1, 15)} kejadian.`,
    });
  }
  insights.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

  // ─── Trend Data ──────────────────────────────────────────────
  const riskTrends: RiskTrendDataPoint[] = [];
  for (let m = 11; m >= 0; m--) {
    riskTrends.push({
      period: monthLabel(m),
      customerAvg: randomBetween(30, 55),
      branchAvg: randomBetween(35, 60),
      officerAvg: randomBetween(20, 45),
      anomalyCount: randomBetween(25, 80),
      durationStdDev: +(randomBetween(50, 250) / 10).toFixed(1),
    });
  }

  const ruleCodes = sectorMeta[sector].ruleCodes;
  const anomalyTrends: AnomalyTrendDataPoint[] = [];
  for (let m = 11; m >= 0; m--) {
    const vals: Record<string, number> = {};
    for (const code of ruleCodes) {
      vals[code] = randomBetween(1, 15);
    }
    anomalyTrends.push({
      period: monthLabel(m),
      ...vals,
      total: Object.values(vals).reduce((s, v) => s + v, 0),
    });
  }

  return {
    anomalyRules: rules,
    anomalyDetections: detections,
    customerRiskProfiles: customerProfiles,
    branchRiskProfiles: branchProfiles,
    officerRiskProfiles: officerProfiles,
    riskScoreHistory: history,
    riskInsights: insights,
    riskTrends,
    anomalyTrends,
  };
}

// ─── Multi-BU Data Cache ─────────────────────────────────────────────

// Force reload cache
const _cache = new Map<string, RiskMockDataSet>();

export function clearMockCache() {
  _cache.clear();
}

/** Get mock data for a specific business unit */
export function getMockDataForBU(buId: string): RiskMockDataSet {
  if (_cache.has(buId)) return _cache.get(buId)!;
  const bu = businessUnits.find(b => b.id === buId);
  if (!bu) throw new Error(`Unknown BU: ${buId}`);
  const data = generateDataForBU(buId, bu.sector);
  _cache.set(buId, data);
  return data;
}

/** Get consolidated mock data across all BUs */
export function getConsolidatedMockData(): RiskMockDataSet {
  const cacheKey = "__consolidated__";
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;

  // Reset PRNG for deterministic consolidated trend generation
  resetRng(9999);
  _idCounter = 5000;

  const allRules: AnomalyRule[] = [];
  const allDetections: AnomalyDetection[] = [];
  const allCustomers: CustomerRiskProfile[] = [];
  const allBranches: BranchRiskProfile[] = [];
  const allOfficers: OfficerRiskProfile[] = [];
  const allHistory: RiskScoreSnapshot[] = [];
  const allInsights: RiskInsight[] = [];

  for (const bu of businessUnits) {
    const data = getMockDataForBU(bu.id);
    // Only add rules once per sector
    if (!allRules.some(r => r.code === data.anomalyRules[0]?.code)) {
      allRules.push(...data.anomalyRules);
    }
    allDetections.push(...data.anomalyDetections);
    allCustomers.push(...data.customerRiskProfiles);
    allBranches.push(...data.branchRiskProfiles);
    allOfficers.push(...data.officerRiskProfiles);
    allHistory.push(...data.riskScoreHistory);
    allInsights.push(...data.riskInsights);
  }

  // Aggregate trend data
  const riskTrends: RiskTrendDataPoint[] = [];
  for (let m = 11; m >= 0; m--) {
    riskTrends.push({
      period: monthLabel(m),
      customerAvg: randomBetween(30, 55),
      branchAvg: randomBetween(35, 60),
      officerAvg: randomBetween(20, 45),
      anomalyCount: randomBetween(100, 400),
      durationStdDev: +(randomBetween(50, 250) / 10).toFixed(1),
    });
  }

  const allCodes = allRules.map(r => r.code);
  const anomalyTrends: AnomalyTrendDataPoint[] = [];
  for (let m = 11; m >= 0; m--) {
    const vals: Record<string, number> = {};
    for (const code of allCodes) vals[code] = randomBetween(2, 30);
    anomalyTrends.push({
      period: monthLabel(m),
      ...vals,
      total: Object.values(vals).reduce((s, v) => s + v, 0),
    });
  }

  const consolidated: RiskMockDataSet = {
    anomalyRules: allRules,
    anomalyDetections: allDetections.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)),
    customerRiskProfiles: allCustomers,
    branchRiskProfiles: allBranches,
    officerRiskProfiles: allOfficers,
    riskScoreHistory: allHistory,
    riskInsights: allInsights.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    riskTrends,
    anomalyTrends,
  };

  _cache.set(cacheKey, consolidated);
  return consolidated;
}

/** Get data based on active BU selection (null = consolidated) */
export function getRiskData(buId: string | null): RiskMockDataSet {
  return buId ? getMockDataForBU(buId) : getConsolidatedMockData();
}

// ─── Convenience Accessors ───────────────────────────────────────────

export const getHighRiskCustomers = (buId: string | null) =>
  getRiskData(buId).customerRiskProfiles
    .filter(c => c.riskLevel === "CRITICAL" || c.riskLevel === "HIGH")
    .sort((a, b) => b.totalScore - a.totalScore);

export const getCriticalAnomalies = (buId: string | null) =>
  getRiskData(buId).anomalyDetections
    .filter(a => a.status === "DETECTED" || a.status === "CONFIRMED")
    .sort((a, b) => b.riskScore - a.riskScore);

export const getBranchRiskRanking = (buId: string | null) =>
  [...getRiskData(buId).branchRiskProfiles].sort((a, b) => b.totalScore - a.totalScore);

export const getUnreadInsights = (buId: string | null) =>
  getRiskData(buId).riskInsights.filter(i => !i.isRead);
