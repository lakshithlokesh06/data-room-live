"use client";

import { useActionState } from "react";
import { createIssueAction } from "@/app/(dashboard)/issues/actions";
import { initialActionState } from "@/lib/auth/action-state";
import { manualIssueTypes, issueSeverities } from "@/types";
import { formatIssueType } from "@/components/data-quality/issue-badges";
import { Button } from "@/components/ui/button";

export function IssueForm({ datasetId, columns }: { datasetId: string; columns: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createIssueAction, initialActionState);
  return <form action={action} className="grid gap-4">
    <input type="hidden" name="datasetId" value={datasetId} />
    <label className="grid gap-1 text-sm font-medium">Title<input className="h-10 rounded border bg-background px-3" name="title" required minLength={3} maxLength={180} /></label>
    <label className="grid gap-1 text-sm font-medium">Description<textarea className="min-h-28 rounded border bg-background p-3" name="description" maxLength={5000} /></label>
    <label className="grid gap-1 text-sm font-medium">Column<select className="h-10 rounded border bg-background px-3" name="columnId"><option value="">Dataset-level</option>{columns.map((column) => <option value={column.id} key={column.id}>{column.name}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium">Issue type<select className="h-10 rounded border bg-background px-3" name="issueType">{manualIssueTypes.map((type) => <option value={type} key={type}>{formatIssueType(type)}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Severity<select className="h-10 rounded border bg-background px-3" name="severity" defaultValue="medium">{issueSeverities.map((severity) => <option value={severity} key={severity}>{severity}</option>)}</select></label>
    </div>
    {state.status === "error" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create issue"}</Button>
  </form>;
}
