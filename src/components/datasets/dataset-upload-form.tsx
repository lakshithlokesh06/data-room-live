"use client";

import { useActionState, useMemo, useState } from "react";
import { FileUp } from "lucide-react";

import { uploadDatasetAction } from "@/app/(dashboard)/datasets/actions";
import {
  initialActionState,
  type ActionState,
} from "@/lib/auth/action-state";
import { formatBytes } from "@/lib/datasets/validation";
import type { UploadableWorkspace } from "@/lib/datasets/queries";
import { Button } from "@/components/ui/button";

type DatasetUploadFormProps = {
  workspaces: UploadableWorkspace[];
};

export function DatasetUploadForm({ workspaces }: DatasetUploadFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    uploadDatasetAction,
    initialActionState
  );
  const [file, setFile] = useState<File | null>(null);
  const defaultWorkspaceId = state.fields?.workspaceId || workspaces[0]?.id || "";
  const selectedFileLabel = useMemo(() => {
    if (!file) {
      return "No file selected";
    }

    return `${file.name} (${formatBytes(file.size)})`;
  }, [file]);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="workspaceId">
          Workspace
        </label>
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue={defaultWorkspaceId}
          id="workspaceId"
          name="workspaceId"
          required
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="name">
          Dataset name
        </label>
        <input
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue={state.fields?.name}
          id="name"
          maxLength={160}
          name="name"
          placeholder="Q3 contract exports"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="description">
          Description
        </label>
        <textarea
          className="min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue={state.fields?.description}
          id="description"
          maxLength={1000}
          name="description"
          placeholder="Optional context for teammates"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="file">
          CSV file
        </label>
        <input
          accept=".csv,text/csv"
          className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium"
          id="file"
          name="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
          type="file"
        />
        <p className="text-sm text-muted-foreground">{selectedFileLabel}</p>
      </div>

      {state.status === "error" ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      <Button disabled={pending} size="lg" type="submit">
        <FileUp aria-hidden="true" />
        {pending ? "Uploading and processing..." : "Upload dataset"}
      </Button>
    </form>
  );
}
