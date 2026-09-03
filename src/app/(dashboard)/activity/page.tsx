import { SectionPlaceholder } from "@/components/shared/section-placeholder";

export default function ActivityPage() {
  return (
    <SectionPlaceholder
      title="Activity"
      description="Realtime activity will show comments, assignments, issue updates, and workspace events."
      plannedItems={["Event stream", "Realtime subscriptions", "Audit-friendly history"]}
    />
  );
}
