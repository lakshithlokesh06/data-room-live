import {
  Activity,
  Database,
  FolderKanban,
  Search,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const dashboardCards = [
  {
    title: "Workspaces",
    description: "Shared review rooms for teams and datasets.",
    status: "Model ready",
    icon: FolderKanban,
  },
  {
    title: "Datasets",
    description: "Registered sources, schema snapshots, and metadata.",
    status: "Upload planned",
    icon: Database,
  },
  {
    title: "Open Issues",
    description: "Quality findings awaiting assignment or resolution.",
    status: "Workflow planned",
    icon: TriangleAlert,
  },
  {
    title: "Recent Activity",
    description: "A live feed for comments, assignments, and state changes.",
    status: "Realtime planned",
    icon: Activity,
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="secondary">Dashboard shell</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Review operations
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The first foundation pass keeps product surfaces present without
            connecting database tables, uploads, auth flows, or realtime channels yet.
          </p>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search will connect after data exists"
            disabled
          />
        </div>
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
            <CardTitle>Foundation checklist</CardTitle>
            <CardDescription>
              Prepared surfaces for the next implementation phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              "Next.js App Router route structure",
              "Supabase browser and server clients",
              "Domain types for workspaces, datasets, issues, comments, and events",
              "shadcn/ui primitives for application shell work",
            ].map((item) => (
              <div
                className="flex items-center justify-between gap-4 rounded-lg border p-3"
                key={item}
              >
                <span className="text-sm font-medium">{item}</span>
                <Badge variant="secondary">Ready</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity placeholder</CardTitle>
            <CardDescription>
              Realtime subscriptions will hydrate this panel later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Separator />
            <p className="text-sm leading-6 text-muted-foreground">
              No activity stream is connected in Phase 1. This panel exists to
              anchor the future event feed and loading states without fake records.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
