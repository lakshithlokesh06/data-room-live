import Link from "next/link";
import { Database, FileUp } from "lucide-react";

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
import { listAccessibleDatasets } from "@/lib/datasets/queries";
import { formatBytes } from "@/lib/datasets/validation";

export default async function DatasetsPage() {
  const datasets = await listAccessibleDatasets();

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">Datasets</h1>
          <p className="max-w-2xl text-muted-foreground">
            Upload CSV files into a workspace and review their processing status,
            size, row count, and column profile.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/datasets/new">
            <FileUp aria-hidden="true" />
            Upload dataset
          </Link>
        </Button>
      </div>

      {datasets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" aria-hidden="true" />
              No datasets yet
            </CardTitle>
            <CardDescription>
              Upload a CSV to create dataset metadata and column profiling for
              your workspace.
            </CardDescription>
            <CardAction>
              <Button asChild variant="outline">
                <Link href="/datasets/new">Upload CSV</Link>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Dataset</th>
                  <th className="py-3 pr-4 font-medium">Workspace</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Rows</th>
                  <th className="py-3 pr-4 font-medium">Columns</th>
                  <th className="py-3 pr-4 font-medium">Uploader</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {datasets.map((dataset) => (
                  <tr key={dataset.id}>
                    <td className="py-3 pr-4 align-top">
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/datasets/${dataset.id}`}
                      >
                        {dataset.name}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {dataset.originalFilename ?? "No file"} ·{" "}
                        {dataset.fileSizeBytes
                          ? formatBytes(dataset.fileSizeBytes)
                          : "Unknown size"}
                      </div>
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {dataset.workspaceName}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <DatasetStatusBadge status={dataset.status} />
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {formatCount(dataset.rowCount)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {formatCount(dataset.columnCount)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {dataset.uploaderName}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {formatDate(dataset.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function formatCount(value: number | null) {
  return value === null ? "Pending" : value.toLocaleString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
