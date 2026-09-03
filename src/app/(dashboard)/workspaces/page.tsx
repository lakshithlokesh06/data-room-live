import { SectionPlaceholder } from "@/components/shared/section-placeholder";

export default function WorkspacesPage() {
  return (
    <SectionPlaceholder
      title="Workspaces"
      description="Workspace management will hold teams, membership, and shared review contexts."
      plannedItems={["Workspace directory", "Member roles", "Review assignments"]}
    />
  );
}
