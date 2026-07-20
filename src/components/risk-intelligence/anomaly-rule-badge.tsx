"use client";

import type { AnomalyRuleCode } from "@/types/risk-intelligence";

// ─── Color palette for all rule codes across sectors ─────────────────

type RuleStyle = { color: string; bg: string; icon: string };

const ruleStyles: Partial<Record<AnomalyRuleCode, RuleStyle>> = {
  // Pergadaian A01-A08
  A01: { color: "text-cyan-300",   bg: "bg-cyan-500/15 border-cyan-500/30",    icon: "⚡" },
  A02: { color: "text-amber-300",  bg: "bg-amber-500/15 border-amber-500/30",  icon: "💰" },
  A03: { color: "text-violet-300", bg: "bg-violet-500/15 border-violet-500/30", icon: "📋" },
  A04: { color: "text-rose-300",   bg: "bg-rose-500/15 border-rose-500/30",    icon: "⏰" },
  A05: { color: "text-blue-300",   bg: "bg-blue-500/15 border-blue-500/30",    icon: "👤" },
  A06: { color: "text-indigo-300", bg: "bg-indigo-500/15 border-indigo-500/30", icon: "⚖️" },
  A07: { color: "text-pink-300",   bg: "bg-pink-500/15 border-pink-500/30",    icon: "🔝" },
  A08: { color: "text-orange-300", bg: "bg-orange-500/15 border-orange-500/30", icon: "🔴" },
  // Multifinance M01-M09
  M01: { color: "text-red-300",     bg: "bg-red-500/15 border-red-500/30",       icon: "📅" },
  M02: { color: "text-teal-300",    bg: "bg-teal-500/15 border-teal-500/30",     icon: "🏁" },
  M03: { color: "text-yellow-300",  bg: "bg-yellow-500/15 border-yellow-500/30", icon: "🚗" },
  M04: { color: "text-fuchsia-300", bg: "bg-fuchsia-500/15 border-fuchsia-500/30", icon: "📊" },
  M05: { color: "text-lime-300",    bg: "bg-lime-500/15 border-lime-500/30",     icon: "👥" },
  M06: { color: "text-sky-300",     bg: "bg-sky-500/15 border-sky-500/30",       icon: "⚡" },
  M07: { color: "text-rose-300",    bg: "bg-rose-500/15 border-rose-500/30",     icon: "🛡️" },
  M08: { color: "text-amber-300",   bg: "bg-amber-500/15 border-amber-500/30",   icon: "🔝" },
  M09: { color: "text-purple-300",  bg: "bg-purple-500/15 border-purple-500/30", icon: "🌐" },
  // Otomotif O01-O09
  O01: { color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/30", icon: "🏷️" },
  O02: { color: "text-orange-300",  bg: "bg-orange-500/15 border-orange-500/30",   icon: "📦" },
  O03: { color: "text-cyan-300",    bg: "bg-cyan-500/15 border-cyan-500/30",       icon: "📈" },
  O04: { color: "text-red-300",     bg: "bg-red-500/15 border-red-500/30",         icon: "🔧" },
  O05: { color: "text-violet-300",  bg: "bg-violet-500/15 border-violet-500/30",   icon: "⚙️" },
  O06: { color: "text-yellow-300",  bg: "bg-yellow-500/15 border-yellow-500/30",   icon: "📢" },
  O07: { color: "text-blue-300",    bg: "bg-blue-500/15 border-blue-500/30",       icon: "🚙" },
  O08: { color: "text-pink-300",    bg: "bg-pink-500/15 border-pink-500/30",       icon: "💳" },
  O09: { color: "text-teal-300",    bg: "bg-teal-500/15 border-teal-500/30",       icon: "🔄" },
};

export const ruleMetadata: Record<string, { name: string; description: string }> = {
  // Pergadaian
  A01: {
    name: "Frekuensi Gadai Tinggi",
    description: "Nasabah melakukan gadai lebih dari 5x dalam 1 bulan"
  },
  A02: {
    name: "Hitung Aging Gadai Besar",
    description: "Aging gadai < 15 hari dengan uang pinjaman > Rp 5.000.000 (selisih tanggal pencairan ke pelunasan/aktif jika belum lunas)"
  },
  A03: {
    name: "Perpanjangan Top-Up Aging Tidak Wajar",
    description: "Transaksi perpanjangan dengan status Top Up dengan aging gadai di bawah 15 hari atau di atas 135 hari"
  },
  A04: {
    name: "Kenaikan LTV Ekstrim saat Top-Up",
    description: "Transaksi perpanjangan Top Up dengan LTV sebelumnya di bawah 70% menjadi di atas 95%"
  },
  A05: {
    name: "Pelunasan Cepat (Hanya Lunas Tebus)",
    description: "Transaksi pelunasan tebus dalam jangka waktu kurang dari 3 hari dari tanggal pencairan"
  },
  A06: {
    name: "Transaksi di Luar Jam Operasional",
    description: "Transaksi dilakukan di luar jam operasional (sebelum pukul 08:00 atau setelah pukul 20:00 waktu lokal cabang)"
  },
  A07: {
    name: "Transaksi Lintas Cabang",
    description: "Nasabah (CIF) melakukan transaksi di beberapa cabang/outlet yang berbeda"
  },

  // Multifinance
  M01: {
    name: "Klaster Angsuran Tertunggak",
    description: "Deteksi angsuran tertunggak berturut-turut"
  },
  M02: {
    name: "Pola Pelunasan Dipercepat",
    description: "Pelunasan dipercepat < 3 bulan dari pencairan"
  },
  M03: {
    name: "Diskrepansi Nilai Jaminan",
    description: "Nilai jaminan kendaraan > 20% di bawah harga pasar"
  },
  M04: {
    name: "Risiko Konsentrasi Dealer",
    description: "Satu dealer > 40% volume pembiayaan cabang"
  },
  M05: {
    name: "Pola Nasabah Fiktif",
    description: "> 3 nasabah alamat/telepon serupa dalam 30 hari"
  },
  M06: {
    name: "Persetujuan Kredit Cepat",
    description: "Approval < 2 jam dari pengajuan (bypass assessment)"
  },
  M07: {
    name: "Anomali Klaim Asuransi",
    description: "Klaim asuransi < 90 hari dari pencairan"
  },
  M08: {
    name: "Top-Up Berlebihan",
    description: "> 2 top-up dalam 6 bulan pada kontrak yang sama"
  },
  M09: {
    name: "Pola Lintas Dealer",
    description: "Nasabah sama mengajukan di 3+ dealer dalam 14 hari"
  },

  // Otomotif
  O01: {
    name: "Indikasi Pending Sales",
    description: "> 50% penjualan terjadi di 7 hari terakhir bulan berjalan"
  },
  O02: {
    name: "Dominasi Leasing pada Sales",
    description: "> 60% penjualan kredit dikuasai oleh 1 perusahaan leasing"
  },
  O04: {
    name: "Ketimpangan Mekanik",
    description: "Mekanik mengerjakan > 50% seluruh WO bengkel di cabangnya"
  },
  O05: {
    name: "Indikasi Penipuan Identitas (Beda STNK)",
    description: "Sales memiliki > 3 penjualan dengan nama STNK berbeda dari pembeli"
  }
};

const defaultStyle: RuleStyle = { color: "text-slate-300", bg: "bg-slate-500/15 border-slate-500/30", icon: "❓" };

type Props = {
  code: AnomalyRuleCode;
  name?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
  tooltipAlign?: "left" | "right" | "center";
};

export function AnomalyRuleBadge({ code, name, showIcon = true, size = "sm", tooltipAlign = "center" }: Props) {
  const config = ruleStyles[code] || defaultStyle;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";
  const meta = ruleMetadata[code];

  const tooltipText = meta ? `${code}: ${meta.name}\n${meta.description}` : undefined;

  const alignClass = 
    tooltipAlign === "left" ? "left-0 translate-x-0" :
    tooltipAlign === "right" ? "right-0 translate-x-0 left-auto" :
    "left-1/2 -translate-x-1/2";

  const arrowClass =
    tooltipAlign === "left" ? "left-4 translate-x-0" :
    tooltipAlign === "right" ? "right-4 translate-x-0 left-auto" :
    "left-1/2 -translate-x-1/2";

  return (
    <span 
      className={`group relative inline-flex items-center gap-1 rounded-md border font-mono font-bold tracking-wider cursor-help transition-all duration-200 hover:brightness-110 ${config.bg} ${config.color} ${sizeClass}`}
      title={tooltipText}
    >
      {showIcon && <span className="text-[10px]">{config.icon}</span>}
      <span>{code}</span>
      {name && size === "md" && <span className="font-sans font-normal opacity-80 ml-1">{name}</span>}
      
      {/* Premium custom tooltip popup */}
      {meta && (
        <span className={`pointer-events-none absolute bottom-full z-50 mb-2 w-64 rounded-lg bg-slate-900 border border-slate-700/80 p-2.5 text-xs text-slate-100 shadow-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 font-sans normal-case text-left leading-relaxed ${alignClass}`}>
          <span className="block font-bold text-amber-400 mb-1">{code}: {meta.name}</span>
          <span className="block text-slate-300 text-[11px] font-normal">{meta.description}</span>
          {/* Tooltip arrow */}
          <span className={`absolute top-full h-2 w-2 -translate-y-1 rotate-45 border-r border-b border-slate-700 bg-slate-900 ${arrowClass}`} />
        </span>
      )}
    </span>
  );
}

// ─── Color Accessor for Charts ───────────────────────────────────────

const chartColors: Partial<Record<AnomalyRuleCode, string>> = {
  // Pergadaian
  A01: "#22d3ee", A02: "#fbbf24", A03: "#a78bfa", A04: "#f43f5e",
  A05: "#3b82f6", A06: "#6366f1", A07: "#ec4899", A08: "#fb923c",
  // Multifinance
  M01: "#ef4444", M02: "#14b8a6", M03: "#eab308", M04: "#d946ef",
  M05: "#84cc16", M06: "#0ea5e9", M07: "#f43f5e", M08: "#f59e0b", M09: "#a855f7",
  // Otomotif
  O01: "#10b981", O02: "#f97316", O03: "#22d3ee", O04: "#ef4444",
  O05: "#8b5cf6", O06: "#eab308", O07: "#3b82f6", O08: "#ec4899", O09: "#14b8a6",
};

export function getAnomalyRuleColor(code: AnomalyRuleCode): string {
  return chartColors[code] || "#94a3b8";
}
