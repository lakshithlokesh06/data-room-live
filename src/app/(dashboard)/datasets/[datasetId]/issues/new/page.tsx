import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueForm } from "@/components/data-quality/issue-form";
import { getDatasetDetail } from "@/lib/datasets/queries";
import { requireUser } from "@/lib/auth/session";
import { getCurrentWorkspaceRole } from "@/lib/data-quality/queries";
import { canWriteIssues } from "@/lib/issues/workflow";

export default async function NewIssuePage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params;
  const [dataset, user] = await Promise.all([getDatasetDetail(datasetId), requireUser()]);
  if (!dataset || !canWriteIssues(await getCurrentWorkspaceRole(dataset.workspaceId, user.id))) notFound();
  return <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-8 sm:px-6">
    <Link className="text-sm text-muted-foreground hover:underline" href={`/datasets/${datasetId}`}>Back to {dataset.name}</Link>
    <h1 className="text-2xl font-semibold">Create issue</h1>
    <IssueForm datasetId={datasetId} columns={dataset.columns} />
  </main>;
}
