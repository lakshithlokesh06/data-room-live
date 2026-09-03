import type React from "react";

import type { DatasetStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

const statusLabels: Record<DatasetStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

const statusVariants: Record<
  DatasetStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  pending: "outline",
  processing: "secondary",
  ready: "default",
  failed: "destructive",
};

export function DatasetStatusBadge({ status }: { status: DatasetStatus }) {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>;
}
