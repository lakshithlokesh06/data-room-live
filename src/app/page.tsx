import Link from "next/link";
import {
  ArrowRight,
  Database,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const featurePreview = [
  {
    title: "Workspace review rooms",
    description:
      "Create shared spaces where data owners and reviewers can coordinate dataset checks.",
    icon: Database,
  },
  {
    title: "Issue-centered discussion",
    description:
      "Turn schema, completeness, and quality concerns into assignable review threads.",
    icon: MessageSquareText,
  },
  {
    title: "Governed access",
    description:
      "Use Supabase Auth foundations for secure team membership and server-side access.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <div className="bg-background">
      <section className="border-b">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex max-w-3xl flex-col justify-center">
            <Badge variant="secondary" className="w-fit">
              Project foundation
            </Badge>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              DataRoom Live
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Collaborative data quality review for modern data teams.
            </p>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              A real-time workspace for registering datasets, inspecting metadata,
              discussing quality issues, and keeping review work moving across a team.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-10 px-4">
                <Link href="/dashboard">
                  Open dashboard
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-10 px-4">
                <Link href="/workspaces">Preview workspace shell</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-sm font-medium">Dataset review queue</p>
                  <p className="text-xs text-muted-foreground">
                    Workspace shell preview
                  </p>
                </div>
                <Badge>Live-ready</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  "Schema metadata",
                  "Quality issue intake",
                  "Reviewer discussion",
                ].map((item) => (
                  <div
                    className="flex items-center justify-between rounded-lg border bg-background p-3"
                    key={item}
                  >
                    <span className="text-sm font-medium">{item}</span>
                    <span className="text-xs text-muted-foreground">Planned</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Supabase clients, type foundations, and route structure are ready
                for the next build phase.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {featurePreview.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">Foundation scope</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
