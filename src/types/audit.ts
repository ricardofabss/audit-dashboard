export type Severity = "Low" | "Medium" | "High" | "Critical";
export type Status = "Open" | "In Review" | "In Progress" | "Resolved" | "Escalated";

export type Finding = {
  id: string;
  title: string;
  branch: string;
  owner: string;
  severity: Severity;
  status: Status;
  sla: string;
  progress: number;
  risk: number;
};

export type Activity = {
  title: string;
  detail: string;
  time: string;
  tone: "cyan" | "emerald" | "amber" | "red" | "indigo" | "slate";
};

export type ModuleMetric = {
  label: string;
  value: string;
  change: string;
  tone: "cyan" | "emerald" | "amber" | "red" | "indigo";
};
