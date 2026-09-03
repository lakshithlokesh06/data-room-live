export type WorkspaceRole = "owner" | "admin" | "reviewer" | "viewer";

export type DatasetStatus =
  | "registered"
  | "profiling"
  | "reviewing"
  | "approved"
  | "archived";

export type IssueSeverity = "low" | "medium" | "high" | "critical";

export type IssueStatus = "open" | "assigned" | "resolved" | "dismissed";

export type ActivityEventType =
  | "workspace.created"
  | "dataset.registered"
  | "issue.opened"
  | "issue.assigned"
  | "issue.resolved"
  | "comment.created";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  displayName?: string;
  joinedAt: string;
}

export interface Dataset {
  id: string;
  workspaceId: string;
  name: string;
  sourceType: "upload" | "database" | "warehouse" | "api";
  status: DatasetStatus;
  rowCount?: number;
  columnCount?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetColumn {
  id: string;
  datasetId: string;
  name: string;
  dataType: string;
  nullable: boolean;
  distinctCount?: number;
  missingCount?: number;
  sampleValues?: string[];
}

export interface DataQualityIssue {
  id: string;
  workspaceId: string;
  datasetId: string;
  columnId?: string;
  title: string;
  description?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  assigneeId?: string;
  createdBy: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  type: ActivityEventType;
  entityId: string;
  entityType: "workspace" | "dataset" | "issue" | "comment";
  summary: string;
  createdAt: string;
}
