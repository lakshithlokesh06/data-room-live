import { WorkspaceCreateForm } from "@/components/workspaces/workspace-create-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listCurrentUserWorkspaces } from "@/lib/workspaces/queries";

export default async function WorkspacesPage() {
  const workspaces = await listCurrentUserWorkspaces();

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_24rem] lg:px-8">
      <div className="space-y-6">
        <div>
          <Badge variant="secondary">Workspace foundation</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Workspaces
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            View the workspaces your account belongs to and create the first
            owner-backed workspace through the secure database RPC.
          </p>
        </div>

        {workspaces.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {workspaces.map((workspace) => (
              <Card key={workspace.id}>
                <CardHeader>
                  <CardTitle>{workspace.name}</CardTitle>
                  <CardDescription>
                    {workspace.description || "No description yet."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">/{workspace.slug}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No workspaces yet</CardTitle>
              <CardDescription>
                Create a workspace to verify auth, RLS, and owner membership.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <WorkspaceCreateForm />
    </div>
  );
}
