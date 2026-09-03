import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, TableProperties } from "lucide-react";

import {
  formatIssueType,
  IssueStatusBadge,
  SeverityBadge,
} from "@/components/data-quality/issue-badges";
import { DatasetStatusBadge } from "@/components/datasets/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listDatasetQualityIssues,
  parseQualityIssueFilters,
  type QualityIssueListItem,
} from "@/lib/data-quality/queries";
import { getDatasetDetail } from "@/lib/datasets/queries";
import { formatBytes } from "@/lib/datasets/validation";
import {
  dataQualityIssueTypes,
  issueSeverities,
  type DataQualityIssueType,
  type IssueSeverity,
} from "@/types";

export default async function DatasetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ datasetId: string }>;
  searchParams: Promise<{
    severity?: string | string[];
    issueType?: string | string[];
  }>;
}) {
  const { datasetId } = await params;
  const filters = parseQualityIssueFilters(await searchParams);
  const dataset = await getDatasetDetail(datasetId);

  if (!dataset) {
    notFound();
  }

  const allQualityIssues = await listDatasetQualityIssues(datasetId);
  const filteredQualityIssues = filterQualityIssues(allQualityIssues, filters);
  const severityCounts = countBySeverity(allQualityIssues);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              {dataset.name}
            </h1>
            <DatasetStatusBadge status={dataset.status} />
          </div>
          <p className="max-w-3xl text-muted-foreground">
            {dataset.description || "No description provided."}
          </p>
        </div>
        {dataset.storagePath ? (
          <Button asChild variant="outline">
            <Link href={`/datasets/${dataset.id}/download`}>
              <Download aria-hidden="true" />
              Download CSV
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Workspace" value={dataset.workspaceName} />
        <Metric label="Rows" value={formatNullableCount(dataset.rowCount)} />
        <Metric
          label="Columns"
          value={formatNullableCount(dataset.columnCount)}
        />
        <Metric
          label="File size"
          value={
            dataset.fileSizeBytes
              ? formatBytes(dataset.fileSizeBytes)
              : "Unknown"
          }
        />
      </section>

      {dataset.status === "failed" && dataset.processingError ? (
        <Card>
          <CardHeader>
            <CardTitle>Processing failed</CardTitle>
            <CardDescription>{dataset.processingError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Data Quality</CardTitle>
          <CardDescription>
            Automatically generated findings from the CSV profiling pass.
          </CardDescription>
          <CardAction>
            <span className="text-sm text-muted-foreground">
              {allQualityIssues.length.toLocaleString()} open
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-4">
            {issueSeverities.map((severity) => (
              <div className="rounded-lg border p-3" key={severity}>
                <div className="mb-2">
                  <SeverityBadge severity={severity} />
                </div>
                <div className="text-2xl font-semibold">
                  {severityCounts[severity].toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterLink
              active={!filters.severity && !filters.issueType}
              datasetId={dataset.id}
              label="All"
            />
            {issueSeverities.map((severity) => (
              <FilterLink
                active={filters.severity === severity}
                datasetId={dataset.id}
                key={severity}
                label={severity.charAt(0).toUpperCase() + severity.slice(1)}
                severity={severity}
              />
            ))}
            {dataQualityIssueTypes.map((issueType) => (
              <FilterLink
                active={filters.issueType === issueType}
                datasetId={dataset.id}
                issueType={issueType}
                key={issueType}
                label={formatIssueType(issueType)}
              />
            ))}
          </div>

          {filteredQualityIssues.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Issue</th>
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 font-medium">Column</th>
                    <th className="py-3 pr-4 font-medium">Severity</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredQualityIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td className="py-3 pr-4 align-top">
                        <Link
                          className="font-medium underline-offset-4 hover:underline"
                          href={`/issues/${issue.id}`}
                        >
                          {issue.title}
                        </Link>
                        <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                          {issue.description}
                        </p>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {formatIssueType(issue.issueType)}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {issue.columnName ?? "Dataset"}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <SeverityBadge severity={issue.severity} />
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <IssueStatusBadge status={issue.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No open automated issues match the current filters.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableProperties className="size-5" aria-hidden="true" />
            Column profile
          </CardTitle>
          <CardDescription>
            Column names, inferred types, missing values, and uniqueness.
          </CardDescription>
          <CardAction>
            <span className="text-sm text-muted-foreground">
              Uploaded {formatDate(dataset.createdAt)}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {dataset.status === "ready" && dataset.columns.length > 0 ? (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Position</th>
                  <th className="py-3 pr-4 font-medium">Column</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Nullable</th>
                  <th className="py-3 pr-4 font-medium">Missing</th>
                  <th className="py-3 pr-4 font-medium">Unique</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dataset.columns.map((column) => (
                  <tr key={column.id}>
                    <td className="py-3 pr-4">{column.position + 1}</td>
                    <td className="py-3 pr-4 font-medium">{column.name}</td>
                    <td className="py-3 pr-4">{column.detectedType}</td>
                    <td className="py-3 pr-4">
                      {column.nullable ? "Yes" : "No"}
                    </td>
                    <td className="py-3 pr-4">
                      {formatNullableCount(column.missingCount)}
                    </td>
                    <td className="py-3 pr-4">
                      {formatNullableCount(column.uniqueCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Column metadata will appear after CSV profiling succeeds.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function FilterLink({
  active,
  datasetId,
  label,
  severity,
  issueType,
}: {
  active: boolean;
  datasetId: string;
  label: string;
  severity?: IssueSeverity;
  issueType?: DataQualityIssueType;
}) {
  const params = new URLSearchParams();

  if (severity) {
    params.set("severity", severity);
  }

  if (issueType) {
    params.set("issueType", issueType);
  }

  const query = params.toString();

  return (
    <Button asChild size="sm" variant={active ? "secondary" : "outline"}>
      <Link href={`/datasets/${datasetId}${query ? `?${query}` : ""}`}>
        {label}
      </Link>
    </Button>
  );
}

function filterQualityIssues(
  issues: QualityIssueListItem[],
  filters: {
    severity?: IssueSeverity;
    issueType?: DataQualityIssueType;
  }
) {
  return issues.filter(
    (issue) =>
      (!filters.severity || issue.severity === filters.severity) &&
      (!filters.issueType || issue.issueType === filters.issueType)
  );
}

function countBySeverity(issues: QualityIssueListItem[]) {
  return issues.reduce<Record<IssueSeverity, number>>(
    (counts, issue) => {
      counts[issue.severity] += 1;
      return counts;
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function formatNullableCount(value: number | null) {
  return value === null ? "Pending" : value.toLocaleString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
