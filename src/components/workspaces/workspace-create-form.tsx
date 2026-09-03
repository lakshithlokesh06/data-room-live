"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";

import { createWorkspaceAction } from "@/app/(dashboard)/workspaces/actions";
import { initialActionState } from "@/lib/auth/action-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function WorkspaceCreateForm() {
  const [state, formAction] = useActionState(
    createWorkspaceAction,
    initialActionState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create workspace</CardTitle>
        <CardDescription>
          The database RPC creates the workspace and owner membership together.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="workspace-name">
              Workspace name
            </label>
            <Input
              id="workspace-name"
              name="name"
              defaultValue={state.fields?.name}
              minLength={2}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="workspace-description"
            >
              Description
            </label>
            <Input
              id="workspace-description"
              name="description"
              defaultValue={state.fields?.description}
              maxLength={500}
            />
          </div>
          {state.message ? (
            <p
              className={
                state.status === "success"
                  ? "rounded-lg border border-primary/20 bg-accent p-3 text-sm text-accent-foreground"
                  : "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              }
            >
              {state.message}
            </p>
          ) : null}
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="h-10 w-full" type="submit" disabled={pending}>
      <Plus />
      {pending ? "Creating..." : "Create workspace"}
    </Button>
  );
}
