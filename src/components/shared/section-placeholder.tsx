import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SectionPlaceholderProps = {
  title: string;
  description: string;
  plannedItems: string[];
};

export function SectionPlaceholder({
  title,
  description,
  plannedItems,
}: SectionPlaceholderProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Badge variant="secondary">Foundation route</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Planned surface</CardTitle>
          <CardDescription>
            This route is intentionally static until the data model and auth flow
            are implemented.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {plannedItems.map((item) => (
            <div
              className="rounded-lg border bg-background p-3 text-sm font-medium"
              key={item}
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
