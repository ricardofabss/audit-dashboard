import type { Activity, Finding, ModuleMetric } from "@/types/audit";

export const branches = [
  { name: "APAC Headquarters", risk: 92, findings: 31, compliance: 81, trend: "up" },
  { name: "Jakarta Operations", risk: 78, findings: 18, compliance: 88, trend: "up" },
  { name: "EMEA Nordics", risk: 64, findings: 14, compliance: 93, trend: "down" },
  { name: "North America West", risk: 42, findings: 9, compliance: 96, trend: "down" },
];

export const executiveMetrics: ModuleMetric[] = [
  { label: "Active Audits", value: "28", change: "+12% vs last month", tone: "cyan" },
  { label: "Open Findings", value: "146", change: "34 due this week", tone: "amber" },
  { label: "Critical Findings", value: "11", change: "3 escalated", tone: "red" },
  { label: "Compliance Score", value: "91%", change: "+4.2 pts", tone: "emerald" },
];

export const fraudTrend = [
  { month: "Jan", anomalies: 18, fraud: 38, wbs: 6 },
  { month: "Feb", anomalies: 24, fraud: 44, wbs: 8 },
  { month: "Mar", anomalies: 22, fraud: 41, wbs: 7 },
  { month: "Apr", anomalies: 35, fraud: 62, wbs: 11 },
  { month: "May", anomalies: 31, fraud: 58, wbs: 10 },
  { month: "Jun", anomalies: 43, fraud: 76, wbs: 15 },
  { month: "Jul", anomalies: 39, fraud: 70, wbs: 13 },
];

export const findings: Finding[] = [
  {
    id: "FIN-2026-081",
    title: "Unauthorized access to vendor master data",
    branch: "APAC Headquarters",
    owner: "Sarah Jenkins",
    severity: "Critical",
    status: "Escalated",
    sla: "2 days overdue",
    progress: 42,
    risk: 94,
  },
  {
    id: "FIN-2026-082",
    title: "Missing approval trail for expenses above USD 10k",
    branch: "Jakarta Operations",
    owner: "Raka Pratama",
    severity: "High",
    status: "In Progress",
    sla: "Due in 3 days",
    progress: 64,
    risk: 78,
  },
  {
    id: "FIN-2026-083",
    title: "Duplicate invoice pattern in facility vendors",
    branch: "APAC Headquarters",
    owner: "Elena Rostova",
    severity: "Critical",
    status: "In Review",
    sla: "Due today",
    progress: 58,
    risk: 88,
  },
  {
    id: "FIN-2026-084",
    title: "Incomplete privileged access review evidence",
    branch: "EMEA Nordics",
    owner: "Michael Chen",
    severity: "Medium",
    status: "Open",
    sla: "Due in 12 days",
    progress: 18,
    risk: 55,
  },
  {
    id: "FIN-2026-085",
    title: "Outdated policy acknowledgement records",
    branch: "North America West",
    owner: "David Kim",
    severity: "Low",
    status: "Resolved",
    sla: "Closed on time",
    progress: 100,
    risk: 24,
  },
];

export const activities: Activity[] = [
  { title: "Legal escalation approved", detail: "FIN-2026-081 moved to legal review by CAE.", time: "8 min ago", tone: "red" },
  { title: "WBS report classified", detail: "AI mapped WBS-884 to procurement fraud cluster.", time: "24 min ago", tone: "indigo" },
  { title: "Evidence uploaded", detail: "12 working papers added to Q3 APAC audit.", time: "1h ago", tone: "cyan" },
  { title: "Mitigation verified", detail: "SOX control remediation passed retest.", time: "3h ago", tone: "emerald" },
];

export const wbsCases = [
  { id: "WBS-884", title: "Fictitious vendor payments", category: "Procurement Fraud", score: 94, status: "Triage", reporter: "Anonymous", age: "2h" },
  { id: "WBS-883", title: "Conflict of interest in supplier selection", category: "Ethics", score: 79, status: "Investigating", reporter: "Protected", age: "1d" },
  { id: "WBS-882", title: "Workplace retaliation after audit inquiry", category: "Misconduct", score: 61, status: "Evidence Review", reporter: "Anonymous", age: "3d" },
];

export const audits = [
  { id: "AUD-APAC-Q3", name: "Q3 Financial Operations Audit", branch: "APAC Headquarters", lead: "Sarah Jenkins", status: "In Progress", progress: 68, risk: "High" },
  { id: "AUD-ITGC-26", name: "ITGC Privileged Access Review", branch: "Global HQ", lead: "Michael Chen", status: "Planning", progress: 28, risk: "Critical" },
  { id: "AUD-VND-26", name: "Vendor Compliance Deep Dive", branch: "Jakarta Operations", lead: "Raka Pratama", status: "Fieldwork", progress: 46, risk: "High" },
];

export const riskRegister = [
  { id: "RSK-01", name: "Privileged access misuse", category: "Technology", likelihood: 5, impact: 5, owner: "CISO Office", mitigation: 62 },
  { id: "RSK-02", name: "Fictitious vendor scheme", category: "Procurement", likelihood: 4, impact: 5, owner: "Finance Ops", mitigation: 41 },
  { id: "RSK-03", name: "Regulatory filing delay", category: "Compliance", likelihood: 3, impact: 4, owner: "Legal", mitigation: 72 },
  { id: "RSK-04", name: "Evidence retention gap", category: "Audit Quality", likelihood: 3, impact: 3, owner: "Internal Audit", mitigation: 55 },
];

export const complianceFrameworks = [
  { name: "SOX Controls", score: 94, gaps: 6 },
  { name: "ISO 27001", score: 91, gaps: 9 },
  { name: "Anti-Bribery Policy", score: 84, gaps: 14 },
  { name: "Data Privacy Controls", score: 88, gaps: 11 },
];

export const documents = [
  { id: "doc-1", name: "Q3_APAC_Working_Papers.zip", type: "Evidence Pack", version: "v7", owner: "Sarah Jenkins", modified: "Today" },
  { id: "doc-2", name: "Vendor_Master_Extract.xlsx", type: "Data Extract", version: "v3", owner: "Finance Ops", modified: "Yesterday" },
  { id: "doc-3", name: "Investigation_Interview_Notes.pdf", type: "Confidential", version: "v2", owner: "Fraud Unit", modified: "2 days ago" },
  { id: "doc-4", name: "SOX_Retest_Report.docx", type: "Report", version: "v4", owner: "Compliance", modified: "4 days ago" },
];

export const aiRecommendations = [
  "Prioritize FIN-2026-081 before closing APAC fieldwork; evidence chain has two unresolved gaps.",
  "Duplicate invoice features match 2024 procurement fraud profile with 87% similarity.",
  "Request legal hold for vendor communications before escalating WBS-884.",
  "Branch risk ranking suggests Jakarta Operations needs a targeted vendor-control audit in Q4.",
];
