import {
  Activity,
  Database,
  FolderKanban,
  Search,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SeverityBadge } from "@/components/data-quality/issue-badges";
import { getDisplayName } from "@/lib/auth/display";
import { getDashboardQualitySummary } from "@/lib/data-quality/queries";
import { requireUser } from "@/lib/auth/session";
import { listActivityEvents } from "@/lib/data-quality/queries";
import { describeActivity } from "@/lib/issues/activity";

export default async function DashboardPage() {
  const user = await requireUser();
  const qualitySummary = await getDashboardQualitySummary();
  const recentEvents = await listActivityEvents(undefined, 5);
  const dashboardCards = [
    {
      title: "Workspaces",
      description: "Shared review rooms for teams and datasets.",
      status: "Active",
      icon: FolderKanban,
    },
    {
      title: "Datasets",
      description: "CSV uploads, private storage, and column profiling.",
      status: "Active",
      icon: Database,
    },
    {
      title: "Open Issues",
      description: `${qualitySummary.openIssueCount.toLocaleString()} quality finding${qualitySummary.openIssueCount === 1 ? "" : "s"} awaiting review.`,
      status: `${qualitySummary.criticalHighIssueCount.toLocaleString()} high priority`,
      icon: TriangleAlert,
    },
    {
      title: "Recent Activity",
      description: `${recentEvents.length} recent workspace events.`,
      status: "View activity",
      icon: Activity,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="secondary">Workspace overview</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Review operations
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Signed in as {getDisplayName(user)}. Review datasets and resolve quality findings with your team.
          </p>
        </div>
        <Link className="inline-flex items-center gap-2 text-sm font-medium hover:underline" href="/issues"><Search className="size-4" />Browse issues</Link>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <p><strong>{qualitySummary.inProgressIssueCount}</strong> in progress</p>
        <p><strong>{qualitySummary.resolvedIssueCount}</strong> resolved</p>
        <p><strong>{qualitySummary.criticalHighIssueCount}</strong> high/critical unresolved</p>
        <p><strong>{qualitySummary.assignedToMeCount}</strong> assigned to me</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <card.icon className="size-5 text-primary" aria-hidden="true" />
                <Badge variant="outline">{card.status}</Badge>
              </div>
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Datasets with issues</CardTitle>
            <CardDescription>
              Unresolved findings grouped by dataset.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {qualitySummary.datasetsWithIssues.length > 0 ? (
              qualitySummary.datasetsWithIssues.map((dataset) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  key={dataset.datasetId}
                >
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">
                      {dataset.datasetName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dataset.issueCount.toLocaleString()} unresolved issue
                      {dataset.issueCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <SeverityBadge severity={dataset.highestSeverity} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No unresolved issues are visible for your workspaces.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest workspace events.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {recentEvents.length ? recentEvents.map((event) => <p key={event.id}><strong>{event.actorName}</strong> {describeActivity(event)}</p>) : <p className="text-muted-foreground">No activity yet.</p>}
            <Link className="hover:underline" href="/activity">View all activity</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
