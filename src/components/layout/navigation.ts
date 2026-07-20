import {
  Activity,
  AlertTriangle,
  Archive,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Fingerprint,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  Settings,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
  Zap,
  Presentation,
  BarChart3,
} from "lucide-react";
import type { ComponentType } from "react";
import type { PermissionCode } from "@/types/auth";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission?: PermissionCode;
};

export const navGroups = [
  {
    label: "Command Center",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.read" },
      { label: "Audit Planning", href: "/planning", icon: CalendarDays },
      { label: "Audit Execution", href: "/execution", icon: ClipboardCheck },
      { label: "Findings", href: "/findings", icon: AlertTriangle, permission: "findings.read" },
      { label: "Follow-up Monitoring", href: "/follow-up", icon: CheckCircle2 },
    ] as NavItem[],
  },
  {
    label: "Reporting",
    items: [
      { label: "Report Dashboard", href: "/report-dashboard", icon: BarChart3, permission: "dashboard.read" },
      { label: "Monthly Reports", href: "/monthly-reports", icon: Presentation, permission: "dashboard.read" },
    ] as NavItem[],
  },
  {
    label: "Anomaly Intelligence",
    items: [
      { label: "Risk Dashboard", href: "/risk-intelligence", icon: Activity },
      { label: "Anomaly Monitor", href: "/risk-intelligence/anomalies", icon: Zap },
      { label: "Customer Risk", href: "/risk-intelligence/customers", icon: Users },
      { label: "Branch Risk", href: "/risk-intelligence/branches", icon: Building2 },
      { label: "Officer Risk", href: "/risk-intelligence/officers", icon: UserCog },
      { label: "Risk Trends", href: "/risk-intelligence/trends", icon: TrendingUp },
    ] as NavItem[],
  },
  {
    label: "Intelligence",
    items: [
      { label: "WBS", href: "/wbs", icon: ShieldAlert, permission: "wbs.read" },
      { label: "Investigation", href: "/investigation", icon: Fingerprint, permission: "investigation.read" },
      { label: "Risk Management", href: "/risk", icon: Gauge, permission: "risk.read" },
      { label: "Compliance", href: "/compliance", icon: ShieldCheck, permission: "compliance.read" },
      { label: "Approval Workflow", href: "/approvals", icon: FileCheck2 },
    ] as NavItem[],
  },
  {
    label: "Workspace",
    items: [
      { label: "Document Center", href: "/documents", icon: Archive },
      { label: "AI Forecasting", href: "/ai-forecasting", icon: Bot },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "User Management", href: "/users", icon: Users, permission: "users.manage" },
      { label: "Settings", href: "/settings", icon: Settings, permission: "settings.manage" },
    ] as NavItem[],
  },
];

export const commandItems = navGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, category: group.label })),
);

export const productIcon = LockKeyhole;
