export const workspaceRoles = ["owner", "admin", "member", "viewer"] as const;

export type WorkspaceRole = (typeof workspaceRoles)[number];

export const datasetStatuses = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const;

export type DatasetStatus = (typeof datasetStatuses)[number];

export const issueSeverities = ["low", "medium", "high", "critical"] as const;

export type IssueSeverity = (typeof issueSeverities)[number];

export const issueStatuses = [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
] as const;

export type IssueStatus = (typeof issueStatuses)[number];

export const activityEventTypes = [
  "workspace.created",
  "member.added",
  "dataset.registered",
  "dataset.upload_started",
  "dataset.ready",
  "dataset.processing_failed",
  "dataset.quality_analysis_completed",
  "dataset.quality_issues_detected",
  "issue.opened",
  "issue.assigned",
  "issue.resolved",
  "comment.created",
] as const;

export type ActivityEventType = (typeof activityEventTypes)[number];

export const dataQualityIssueTypes = [
  "missing_values",
  "duplicate_rows",
  "constant_column",
  "high_cardinality",
  "mixed_types",
  "numeric_outliers",
  "inconsistent_categories",
  "invalid_dates",
  "whitespace_anomaly",
  "unnamed_column",
] as const;

export type DataQualityIssueType = (typeof dataQualityIssueTypes)[number];

export const issueSources = ["manual", "automated"] as const;

export type IssueSource = (typeof issueSources)[number];

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Dataset {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  originalFilename: string | null;
  storagePath: string | null;
  fileSizeBytes: number | null;
  status: DatasetStatus;
  rowCount: number | null;
  columnCount: number | null;
  processingError: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetColumn {
  id: string;
  datasetId: string;
  name: string;
  position: number;
  detectedType: string | null;
  nullable: boolean;
  missingCount: number | null;
  uniqueCount: number | null;
  createdAt: string;
}

export interface DataQualityIssue {
  id: string;
  workspaceId: string;
  datasetId: string;
  columnId: string | null;
  title: string;
  description: string | null;
  issueType: string;
  severity: IssueSeverity;
  status: IssueStatus;
  assignedTo: string | null;
  createdBy: string;
  source: IssueSource;
  detectionMetadata: Record<string, unknown> | null;
  automatedIssueKey: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  actorId: string | null;
  eventType: ActivityEventType | string;
  entityType: "workspace" | "member" | "dataset" | "column" | "issue" | "comment";
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
