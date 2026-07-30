export type AppRole = "OWNER" | "HEAD_AUDIT" | "AUDITOR" | "INVESTIGATOR" | "AUDITEE" | "ADMIN";

export type PermissionCode =
  | "dashboard.read"
  | "audit.read"
  | "audit.execute"
  | "findings.read"
  | "findings.manage"
  | "wbs.read"
  | "investigation.read"
  | "risk.read"
  | "compliance.read"
  | "followup.read"
  | "users.manage"
  | "settings.manage";

export type SessionIdentity = {
  userId: string;
  fullName?: string | null;
  email: string | null;
  profileId: string | null;
  roles: AppRole[];
  permissions: PermissionCode[];
  branchId: string | null;
  divisionId: string | null;
};
