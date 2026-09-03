import Link from "next/link";

import { DatasetUploadForm } from "@/components/datasets/dataset-upload-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listUploadableWorkspaces } from "@/lib/datasets/queries";

export default async function NewDatasetPage() {
  const workspaces = await listUploadableWorkspaces();

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-normal">
          Upload dataset
        </h1>
        <p className="text-muted-foreground">
          Add a CSV to a workspace and build its column profile for review.
        </p>
      </div>

      {workspaces.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No uploadable workspaces</CardTitle>
            <CardDescription>
              Ask a workspace owner or admin for upload access.
            </CardDescription>
            <CardAction>
              <Button asChild variant="outline">
                <Link href="/workspaces">View workspaces</Link>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <DatasetUploadForm workspaces={workspaces} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
