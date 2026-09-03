import { SectionPlaceholder } from "@/components/shared/section-placeholder";

export default function DatasetsPage() {
  return (
    <SectionPlaceholder
      title="Datasets"
      description="Dataset registration will capture source metadata, schemas, and review readiness."
      plannedItems={["Dataset registry", "Column metadata", "Quality snapshots"]}
    />
  );
}
