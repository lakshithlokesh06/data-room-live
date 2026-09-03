import type React from "react";

import type { DataQualityIssueType, IssueSeverity, IssueStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

const severityVariants: Record<
  IssueSeverity,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
  critical: "destructive",
};

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  return (
    <Badge variant={severityVariants[severity]}>
      {severity === "critical" ? "Critical" : titleCase(severity)}
    </Badge>
  );
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <Badge variant="outline">{formatIssueStatus(status)}</Badge>;
}

export function formatIssueType(issueType: DataQualityIssueType | string) {
  return issueType
    .split("_")
    .map((part) => titleCase(part))
    .join(" ");
}

function formatIssueStatus(status: IssueStatus) {
  return status
    .split("_")
    .map((part) => titleCase(part))
    .join(" ");
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
