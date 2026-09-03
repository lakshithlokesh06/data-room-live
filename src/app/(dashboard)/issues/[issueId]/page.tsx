import Link from "next/link";
import { notFound } from "next/navigation";

import {
  formatIssueType,
  IssueStatusBadge,
  SeverityBadge,
} from "@/components/data-quality/issue-badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getIssueDetail } from "@/lib/data-quality/queries";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  const issue = await getIssueDetail(issueId);

  if (!issue) {
    notFound();
  }

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-3">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href={`/datasets/${issue.datasetId}`}
        >
          Back to {issue.datasetName}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            {issue.title}
          </h1>
          <SeverityBadge severity={issue.severity} />
          <IssueStatusBadge status={issue.status} />
        </div>
        <p className="text-muted-foreground">{issue.description}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Detail label="Dataset" value={issue.datasetName} />
        <Detail label="Workspace" value={issue.workspaceName} />
        <Detail label="Column" value={issue.columnName ?? "Dataset-level"} />
        <Detail label="Issue type" value={formatIssueType(issue.issueType)} />
        <Detail
          label="Source"
          value={issue.source === "automated" ? "Automated" : "Manual"}
        />
        <Detail label="Created" value={formatDate(issue.createdAt)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Detection Summary</CardTitle>
          <CardDescription>
            Compact metadata from the detector. Raw CSV rows and cell values are
            not stored here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {issue.detectionMetadata ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(issue.detectionMetadata).map(([key, value]) => (
                <div className="rounded-lg border p-3" key={key}>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {key.replaceAll("_", " ")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {formatMetadataValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No detector metadata is attached to this issue.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function formatMetadataValue(value: unknown) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined) {
    return "None";
  }

  return String(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
