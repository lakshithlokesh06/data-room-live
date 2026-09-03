import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, TableProperties } from "lucide-react";

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
import { getDatasetDetail } from "@/lib/datasets/queries";
import { formatBytes } from "@/lib/datasets/validation";

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  const dataset = await getDatasetDetail(datasetId);

  if (!dataset) {
    notFound();
  }

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
