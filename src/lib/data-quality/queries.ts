import "server-only";

import {
  dataQualityIssueTypes,
  type DataQualityIssueType,
  type IssueSeverity,
  issueSeverities,
  type IssueSource,
  type IssueStatus,
} from "@/types";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

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
  issue_type: DataQualityIssueType;
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
  issueType?: DataQualityIssueType;
};

export type QualityIssueListItem = ReturnType<typeof mapIssueRow> & {
  datasetName: string;
  workspaceName: string;
  columnName: string | null;
};

export type DatasetIssueSignal = {
  issueCount: number;
  highestSeverity: IssueSeverity | null;
};

export type DashboardQualitySummary = {
  openIssueCount: number;
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
    .select(
      "id, workspace_id, dataset_id, column_id, title, description, issue_type, severity, status, assigned_to, created_by, source, detection_metadata, automated_issue_key, created_at, updated_at, resolved_at"
    )
    .eq("dataset_id", datasetId)
    .eq("source", "automated")
    .eq("status", "open");

  if (filters.severity) {
    query = query.eq("severity", filters.severity);
  }

  if (filters.issueType) {
    query = query.eq("issue_type", filters.issueType);
  }

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
    .select(
      "id, workspace_id, dataset_id, column_id, title, description, issue_type, severity, status, assigned_to, created_by, source, detection_metadata, automated_issue_key, created_at, updated_at, resolved_at"
    )
    .eq("id", issueId)
    .maybeSingle<IssueRow>();

  if (error || !data) {
    return null;
  }

  const [issue] = await hydrateIssues([data]);
  return issue ?? null;
}

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
    .eq("status", "open");

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
  const emptySummary: DashboardQualitySummary = {
    openIssueCount: 0,
    criticalHighIssueCount: 0,
    datasetsWithIssues: [],
  };

  if (!getSupabaseConfig()) {
    return emptySummary;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_quality_issues")
    .select("dataset_id, severity")
    .eq("status", "open");

  if (error || !data) {
    return emptySummary;
  }

  const issues = data as Pick<IssueRow, "dataset_id" | "severity">[];
  const datasetIds = unique(issues.map((issue) => issue.dataset_id));
  const datasets = await getDatasets(datasetIds);
  const grouped = new Map<
    string,
    { issueCount: number; highestSeverity: IssueSeverity }
  >();

  for (const issue of issues) {
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
    openIssueCount: issues.length,
    criticalHighIssueCount: issues.filter(
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
}): QualityIssueFilters {
  const severity = firstValue(searchParams.severity);
  const issueType = firstValue(searchParams.issueType);

  return {
    severity: isIssueSeverity(severity) ? severity : undefined,
    issueType: isDataQualityIssueType(issueType) ? issueType : undefined,
  };
}

async function hydrateIssues(rows: IssueRow[]): Promise<QualityIssueListItem[]> {
  const [datasets, workspaces, columns] = await Promise.all([
    getDatasets(rows.map((row) => row.dataset_id)),
    getWorkspaces(rows.map((row) => row.workspace_id)),
    getColumns(rows.flatMap((row) => (row.column_id ? [row.column_id] : []))),
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
    };
  });
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

function isDataQualityIssueType(
  value: string | undefined
): value is DataQualityIssueType {
  return dataQualityIssueTypes.includes(value as DataQualityIssueType);
}
