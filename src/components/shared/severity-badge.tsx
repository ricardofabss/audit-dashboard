import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/types/audit";

const toneBySeverity: Record<Severity, "emerald" | "cyan" | "amber" | "red"> = {
  Low: "emerald",
  Medium: "cyan",
  High: "amber",
  Critical: "red",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={toneBySeverity[severity]}>{severity}</Badge>;
}
