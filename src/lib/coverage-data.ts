export const summaryData = {
  gmn: {
    name: "Gadai Mas Nusantara",
    color: "#0ea5e9", // cyan/blue
    kcp: 263,
    noaAktif: 391116,
    noaAudited: 87535,
    auditor: 55,
    mpp: "92 (-37)",
    coverage: [
      { name: "Audited", value: 87535, fill: "#0ea5e9" },
      { name: "Belum Teraudit", value: 303581, fill: "#94a3b8" }
    ],
    coveragePct: "22,4%",
    productivity: [
      { month: "Jan-26", value: 75388 },
      { month: "Feb-26", value: 67937 },
      { month: "Mar-26", value: 73875 },
      { month: "Apr-26", value: 80566 },
      { month: "May-26", value: 87535 }
    ]
  },
  mulia: {
    name: "Gadai Mulia",
    color: "#f59e0b", // amber/yellow
    kcp: 29,
    noaAktif: 12640,
    noaAudited: 12640,
    auditor: 8,
    mpp: "8",
    coverage: [
      { name: "Audited", value: 12640, fill: "#f59e0b" },
      { name: "Belum Teraudit", value: 0, fill: "#94a3b8" }
    ],
    coveragePct: "100%",
    productivity: [
      { month: "Jan-26", value: 11605 },
      { month: "Feb-26", value: 12501 },
      { month: "Mar-26", value: 11959 },
      { month: "Apr-26", value: 12582 },
      { month: "May-26", value: 12640 }
    ]
  },
  pajak: {
    name: "Pajak Mas",
    color: "#10b981", // emerald/green
    kcp: 4,
    noaAktif: 23101,
    noaAudited: 21939,
    auditor: 3,
    mpp: "3",
    coverage: [
      { name: "Audited", value: 21939, fill: "#10b981" },
      { name: "Belum Teraudit", value: 1162, fill: "#94a3b8" }
    ],
    coveragePct: "95%",
    productivity: [
      { month: "Jan-26", value: 21798 },
      { month: "Feb-26", value: 21391 },
      { month: "Mar-26", value: 22143 },
      { month: "Apr-26", value: 22446 },
      { month: "May-26", value: 21939 }
    ]
  }
};

export const aumData = [
  {
    name: "GMS",
    audited: 195998004197,
    belum: 400000000000, // estimated from visual bar size
    auditedLabel: "Rp195.998.004.197",
    belumLabel: "-"
  },
  {
    name: "GMN",
    audited: 1378082479452,
    belum: 2000934002759,
    auditedLabel: "1.378.082.479.452",
    belumLabel: "2.000.934.002.759"
  }
];

export const noaProductivityPerAuditor = [
  { month: "January", gmn: 1478, mulia: 1658, pajak: 7266 },
  { month: "February", gmn: 1332, mulia: 1786, pajak: 7130 },
  { month: "March", gmn: 1449, mulia: 1708, pajak: 7308 },
  { month: "April", gmn: 1549, mulia: 1797, pajak: 7482 },
  { month: "May", gmn: 1683, mulia: 1806, pajak: 7313 },
];
