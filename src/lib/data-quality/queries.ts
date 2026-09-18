import "server-only";

import {
  dataQualityIssueTypes,
  type DataQualityIssueType,
  type IssueSeverity,
  issueSeverities,
  type IssueSource,
  type IssueStatus,
  type IssueType,
  issueStatuses,
  issueSources,
  manualIssueTypes,
  type WorkspaceRole,
} from "@/types";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

const severityRank: Record<IssueSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

type IssueRow = {
  id: string;
  workspace_id: string;
  dataset_id: string;
  column_id: string | null;
  title: string;
  description: string | null;
  issue_type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  assigned_to: string | null;
  created_by: string;
  source: IssueSource;
  detection_metadata: Record<string, unknown> | null;
  automated_issue_key: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
};

type DatasetRow = {
  id: string;
  workspace_id: string;
  name: string;
};

type WorkspaceRow = {
  id: string;
  name: string;
};

type ColumnRow = {
  id: string;
  dataset_id: string;
  name: string;
  position: number;
};

export type QualityIssueFilters = {
  severity?: IssueSeverity;
  issueType?: IssueType;
  status?: IssueStatus;
};

export type QualityIssueListItem = ReturnType<typeof mapIssueRow> & {
  datasetName: string;
  workspaceName: string;
  columnName: string | null;
  assigneeName: string | null;
  creatorName: string | null;
  resolverName: string | null;
};

export type DatasetIssueSignal = {
  issueCount: number;
  highestSeverity: IssueSeverity | null;
};

export type DashboardQualitySummary = {
  openIssueCount: number;
  inProgressIssueCount: number;
  resolvedIssueCount: number;
  assignedToMeCount: number;
  criticalHighIssueCount: number;
  datasetsWithIssues: {
    datasetId: string;
    datasetName: string;
    issueCount: number;
    highestSeverity: IssueSeverity;
  }[];
};

export async function listDatasetQualityIssues(
  datasetId: string,
  filters: QualityIssueFilters = {}
): Promise<QualityIssueListItem[]> {
  if (!getSupabaseConfig()) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("data_quality_issues")
    .select(issueSelect)
    .eq("dataset_id", datasetId);

  if (filters.severity) {
    query = query.eq("severity", filters.severity);
  }

  if (filters.issueType) {
    query = query.eq("issue_type", filters.issueType);
  }
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error || !data) {
    return [];
  }

  return hydrateIssues(data as IssueRow[]);
}

export async function getIssueDetail(
  issueId: string
): Promise<QualityIssueListItem | null> {
  if (!getSupabaseConfig()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_quality_issues")
    .select(issueSelect)
    .eq("id", issueId)
    .maybeSingle<IssueRow>();

  if (error || !data) {
    return null;
  }

  const [issue] = await hydrateIssues([data]);
  return issue ?? null;
}

export async function listAccessibleIssues(filters: {
  workspace?: string; dataset?: string; severity?: string; status?: string;
  source?: string; assignedTo?: string; search?: string;
}, userId: string, page = 1): Promise<{ issues: QualityIssueListItem[]; hasMore: boolean }> {
  if (!getSupabaseConfig()) return { issues: [], hasMore: false };
  const supabase = await createClient();
  let query = supabase.from("data_quality_issues").select(issueSelect);
  if (filters.workspace) query = query.eq("workspace_id", filters.workspace);
  if (filters.dataset) query = query.eq("dataset_id", filters.dataset);
  if (issueSeverities.includes(filters.severity as IssueSeverity)) query = query.eq("severity", filters.severity!);
  if (issueStatuses.includes(filters.status as IssueStatus)) query = query.eq("status", filters.status!);
  if (issueSources.includes(filters.source as IssueSource)) query = query.eq("source", filters.source!);
  if (filters.assignedTo === "me") query = query.eq("assigned_to", userId);
  const search = filters.search?.trim().slice(0, 100).replace(/[^a-zA-Z0-9 _-]/g, "");
  if (search) {
    const { data: matchingDatasets } = await supabase.from("datasets").select("id")
      .ilike("name", `%${search}%`).limit(1000);
    const ids = (matchingDatasets ?? []).map((dataset) => dataset.id);
    query = ids.length
      ? query.or(`title.ilike.%${search}%,dataset_id.in.(${ids.join(",")})`)
      : query.ilike("title", `%${search}%`);
  }
  const { data } = await query.order("created_at", { ascending: false })
    .range((page - 1) * 50, page * 50);
  const rows = (data ?? []) as IssueRow[];
  return { issues: await hydrateIssues(rows.slice(0, 50)), hasMore: rows.length > 50 };
}

export async function listAccessibleIssueDatasets() {
  if (!getSupabaseConfig()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("datasets").select("id, name").order("name");
  return (data ?? []) as { id: string; name: string }[];
}

export async function listWorkspaceMembers(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_members").select("user_id, role")
    .eq("workspace_id", workspaceId);
  const members = (data ?? []) as { user_id: string; role: WorkspaceRole }[];
  const names = await getProfiles(members.map((member) => member.user_id));
  return members.map((member) => ({ id: member.user_id, role: member.role,
    name: names.get(member.user_id) ?? "Workspace member" }));
}

export async function getCurrentWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle<{ role: WorkspaceRole }>();
  return data?.role ?? null;
}

export async function listIssueComments(issueId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("issue_comments")
    .select("id, author_id, content, created_at, updated_at")
    .eq("issue_id", issueId).order("created_at", { ascending: true });
  const rows = (data ?? []) as { id: string; author_id: string; content: string; created_at: string; updated_at: string }[];
  const names = await getProfiles(rows.map((row) => row.author_id));
  return rows.map((row) => ({ id: row.id, authorId: row.author_id,
    authorName: names.get(row.author_id) ?? "Former member", content: row.content,
    createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function listActivityEvents(issueId?: string, limit = 100, offset = 0) {
  if (!getSupabaseConfig()) return [];
  const supabase = await createClient();
  let query = supabase.from("activity_events")
    .select("id, workspace_id, actor_id, event_type, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (issueId) query = query.eq("entity_type", "issue").eq("entity_id", issueId);
  const { data } = await query;
  const rows = (data ?? []) as { id: string; workspace_id: string; actor_id: string | null;
    event_type: string; entity_type: string; entity_id: string | null;
    metadata: Record<string, unknown>; created_at: string }[];
  const names = await getProfiles(rows.flatMap((row) => row.actor_id ? [row.actor_id] : []));
  return rows.map((row) => ({ ...row, actorName: row.actor_id ? names.get(row.actor_id) ?? "Former member" : "System" }));
}

const issueSelect = "id, workspace_id, dataset_id, column_id, title, description, issue_type, severity, status, assigned_to, created_by, source, detection_metadata, automated_issue_key, created_at, updated_at, resolved_at, resolved_by, resolution_note";

export async function getDatasetIssueSignals(datasetIds: string[]) {
  const signals = new Map<string, DatasetIssueSignal>();
  const ids = unique(datasetIds);

  if (!getSupabaseConfig() || ids.length === 0) {
    return signals;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_quality_issues")
    .select("dataset_id, severity")
    .in("dataset_id", ids)
    .in("status", ["open", "in_progress"]);

  if (error || !data) {
    return signals;
  }

  for (const issue of data as Pick<IssueRow, "dataset_id" | "severity">[]) {
    const current = signals.get(issue.dataset_id) ?? {
      issueCount: 0,
      highestSeverity: null,
    };
    const highestSeverity =
      !current.highestSeverity ||
      severityRank[issue.severity] > severityRank[current.highestSeverity]
        ? issue.severity
        : current.highestSeverity;

    signals.set(issue.dataset_id, {
      issueCount: current.issueCount + 1,
      highestSeverity,
    });
  }

  return signals;
}

export async function getDashboardQualitySummary(): Promise<DashboardQualitySummary> {
  const currentUserId = (await getCurrentUser())?.id ?? null;
  const emptySummary: DashboardQualitySummary = {
    openIssueCount: 0,
    inProgressIssueCount: 0,
    resolvedIssueCount: 0,
    assignedToMeCount: 0,
    criticalHighIssueCount: 0,
    datasetsWithIssues: [],
  };

  if (!getSupabaseConfig()) {
    return emptySummary;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_quality_issues")
    .select("dataset_id, severity, status, assigned_to");

  if (error || !data) {
    return emptySummary;
  }

  const issues = data as Pick<IssueRow, "dataset_id" | "severity" | "status" | "assigned_to">[];
  const active = issues.filter((issue) => issue.status === "open" || issue.status === "in_progress");
  const datasetIds = unique(active.map((issue) => issue.dataset_id));
  const datasets = await getDatasets(datasetIds);
  const grouped = new Map<
    string,
    { issueCount: number; highestSeverity: IssueSeverity }
  >();

  for (const issue of active) {
    const current = grouped.get(issue.dataset_id);

    if (!current) {
      grouped.set(issue.dataset_id, {
        issueCount: 1,
        highestSeverity: issue.severity,
      });
      continue;
    }

    grouped.set(issue.dataset_id, {
      issueCount: current.issueCount + 1,
      highestSeverity:
        severityRank[issue.severity] > severityRank[current.highestSeverity]
          ? issue.severity
          : current.highestSeverity,
    });
  }

  return {
    openIssueCount: issues.filter((issue) => issue.status === "open").length,
    inProgressIssueCount: issues.filter((issue) => issue.status === "in_progress").length,
    resolvedIssueCount: issues.filter((issue) => issue.status === "resolved").length,
    assignedToMeCount: issues.filter((issue) => issue.assigned_to === currentUserId).length,
    criticalHighIssueCount: active.filter(
      (issue) => issue.severity === "critical" || issue.severity === "high"
    ).length,
    datasetsWithIssues: Array.from(grouped.entries())
      .flatMap(([datasetId, summary]) => {
        const dataset = datasets.get(datasetId);

        if (!dataset) {
          return [];
        }

        return {
          datasetId,
          datasetName: dataset.name,
          issueCount: summary.issueCount,
          highestSeverity: summary.highestSeverity,
        };
      })
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, 5),
  };
}

export function parseQualityIssueFilters(searchParams: {
  severity?: string | string[];
  issueType?: string | string[];
  status?: string | string[];
}): QualityIssueFilters {
  const severity = firstValue(searchParams.severity);
  const issueType = firstValue(searchParams.issueType);
  const status = firstValue(searchParams.status);

  return {
    severity: isIssueSeverity(severity) ? severity : undefined,
    issueType: isDataQualityIssueType(issueType) ? issueType : undefined,
    status: issueStatuses.includes(status as IssueStatus) ? status as IssueStatus : undefined,
  };
}

async function hydrateIssues(rows: IssueRow[]): Promise<QualityIssueListItem[]> {
  const [datasets, workspaces, columns, profiles] = await Promise.all([
    getDatasets(rows.map((row) => row.dataset_id)),
    getWorkspaces(rows.map((row) => row.workspace_id)),
    getColumns(rows.flatMap((row) => (row.column_id ? [row.column_id] : []))),
    getProfiles(rows.flatMap((row) => [row.created_by, row.assigned_to, row.resolved_by].filter((id): id is string => Boolean(id)))),
  ]);

  return rows.map((row) => {
    const dataset = datasets.get(row.dataset_id);
    const workspace = workspaces.get(row.workspace_id);
    const column = row.column_id ? columns.get(row.column_id) : null;

    return {
      ...mapIssueRow(row),
      datasetName: dataset?.name ?? "Unknown dataset",
      workspaceName: workspace?.name ?? "Unknown workspace",
      columnName: column?.name ?? null,
      assigneeName: row.assigned_to ? profiles.get(row.assigned_to) ?? "Former member" : null,
      creatorName: profiles.get(row.created_by) ?? "Former member",
      resolverName: row.resolved_by ? profiles.get(row.resolved_by) ?? "Former member" : null,
    };
  });
}

async function getProfiles(userIds: string[]) {
  const names = new Map<string, string>();
  const ids = unique(userIds);
  if (ids.length === 0) return names;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  for (const profile of (data ?? []) as { id: string; full_name: string | null }[]) {
    names.set(profile.id, profile.full_name?.trim() || "Workspace member");
  }
  return names;
}

async function getDatasets(datasetIds: string[]) {
  const ids = unique(datasetIds);
  const datasets = new Map<string, DatasetRow>();

  if (ids.length === 0) {
    return datasets;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("datasets")
    .select("id, workspace_id, name")
    .in("id", ids);

  for (const dataset of (data ?? []) as DatasetRow[]) {
    datasets.set(dataset.id, dataset);
  }

  return datasets;
}

async function getWorkspaces(workspaceIds: string[]) {
  const ids = unique(workspaceIds);
  const workspaces = new Map<string, WorkspaceRow>();

  if (ids.length === 0) {
    return workspaces;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, name")
    .in("id", ids);

  for (const workspace of (data ?? []) as WorkspaceRow[]) {
    workspaces.set(workspace.id, workspace);
  }

  return workspaces;
}

async function getColumns(columnIds: string[]) {
  const ids = unique(columnIds);
  const columns = new Map<string, ColumnRow>();

  if (ids.length === 0) {
    return columns;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("dataset_columns")
    .select("id, dataset_id, name, position")
    .in("id", ids);

  for (const column of (data ?? []) as ColumnRow[]) {
    columns.set(column.id, column);
  }

  return columns;
}

function mapIssueRow(row: IssueRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    datasetId: row.dataset_id,
    columnId: row.column_id,
    title: row.title,
    description: row.description,
    issueType: row.issue_type,
    severity: row.severity,
    status: row.status,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    source: row.source,
    detectionMetadata: row.detection_metadata,
    automatedIssueKey: row.automated_issue_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    resolutionNote: row.resolution_note,
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isIssueSeverity(value: string | undefined): value is IssueSeverity {
  return issueSeverities.includes(value as IssueSeverity);
}

function isDataQualityIssueType(value: string | undefined): value is IssueType {
  return dataQualityIssueTypes.includes(value as DataQualityIssueType) || manualIssueTypes.includes(value as (typeof manualIssueTypes)[number]);
}
