"use client";

import { useActionState } from "react";
import { issueMutationAction } from "@/app/(dashboard)/issues/actions";
import { initialActionState } from "@/lib/auth/action-state";
import { allowedTransitions, canEditSeverity, canWriteIssues, commentMaxLength } from "@/lib/issues/workflow";
import { issueSeverities, type IssueStatus, type WorkspaceRole } from "@/types";
import { Button } from "@/components/ui/button";

function MutationForm({ issueId, operation, children, label }: {
  issueId: string; operation: string; children: React.ReactNode; label: string;
}) {
  const [state, action, pending] = useActionState(issueMutationAction, initialActionState);
  return <form action={action} className="grid gap-2">
    <input type="hidden" name="issueId" value={issueId} />
    <input type="hidden" name="operation" value={operation} />
    {children}
    <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving..." : label}</Button>
    {state.status === "error" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    {state.status === "success" && <p role="status" className="text-xs text-muted-foreground">Saved.</p>}
  </form>;
}

const statusLabels: Record<IssueStatus, string> = {
  open: "Move to open", in_progress: "Start review", resolved: "Resolve", dismissed: "Dismiss",
};

export function IssueWorkflow({ issueId, status, severity, assignedTo, role, members }: {
  issueId: string; status: IssueStatus; severity: string; assignedTo: string | null;
  role: WorkspaceRole | null; members: { id: string; name: string }[];
}) {
  if (!canWriteIssues(role)) return <p className="text-sm text-muted-foreground">Review controls are available to workspace editors.</p>;
  return <div className="grid gap-6 sm:grid-cols-2">
    <div className="grid gap-2"><h3 className="text-sm font-semibold">Status</h3>
      {allowedTransitions[status].map((next) => <MutationForm key={next} issueId={issueId} operation="status" label={statusLabels[next]}>
        <input type="hidden" name="status" value={next} />
        {(next === "resolved" || next === "dismissed") && <label className="grid gap-1 text-xs">Resolution note (optional)<input name="note" maxLength={1000} className="h-9 rounded border bg-background px-2 text-sm" /></label>}
      </MutationForm>)}
    </div>
    <div className="grid content-start gap-4">
      <div><h3 className="mb-2 text-sm font-semibold">Assignee</h3>
        <MutationForm issueId={issueId} operation="assignee" label="Save assignee">
          <select name="assignee" aria-label="Assignee" defaultValue={assignedTo ?? ""} className="h-9 rounded border bg-background px-2 text-sm">
            <option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </MutationForm>
      </div>
      {canEditSeverity(role) && <div><h3 className="mb-2 text-sm font-semibold">Severity</h3>
        <MutationForm issueId={issueId} operation="severity" label="Save severity">
          <select name="severity" aria-label="Severity" defaultValue={severity} className="h-9 rounded border bg-background px-2 text-sm">
            {issueSeverities.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </MutationForm>
      </div>}
    </div>
  </div>;
}

export function CommentControls({ issueId, commentId, content, editable }: {
  issueId: string; commentId?: string; content?: string; editable: boolean;
}) {
  if (!editable) return null;
  const form = <MutationForm issueId={issueId} operation={commentId ? "comment-edit" : "comment-add"} label={commentId ? "Save edit" : "Add comment"}>
    {commentId && <input type="hidden" name="commentId" value={commentId} />}
    <textarea aria-label={commentId ? "Edit comment" : "New comment"} name="content" required maxLength={commentMaxLength}
      defaultValue={content} className="min-h-20 rounded border bg-background p-2 text-sm" />
  </MutationForm>;
  if (!commentId) return form;
  return <div className="flex flex-wrap gap-4 text-sm">
    <details><summary className="cursor-pointer">Edit</summary><div className="mt-2 w-72 max-w-full">{form}</div></details>
    <details><summary className="cursor-pointer text-destructive">Delete</summary>
      <p className="my-2 text-muted-foreground">This permanently removes the comment.</p>
      <MutationForm issueId={issueId} operation="comment-delete" label="Confirm delete">
        <input type="hidden" name="commentId" value={commentId} />
      </MutationForm>
    </details>
  </div>;
}
