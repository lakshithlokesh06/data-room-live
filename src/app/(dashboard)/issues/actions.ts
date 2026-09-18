"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/auth/action-state";
import { getIssueDetail } from "@/lib/data-quality/queries";
import {
  addIssueComment, changeIssueAssignee, changeIssueComment,
  changeIssueSeverity, changeIssueStatus, createManualIssue,
} from "@/lib/issues/mutations";
import { issueStatuses, type IssueStatus } from "@/types";

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

export async function createIssueAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const result = await createManualIssue({ datasetId: field(form, "datasetId"),
    columnId: field(form, "columnId") || null, title: field(form, "title"),
    description: field(form, "description"), issueType: field(form, "issueType"),
    severity: field(form, "severity") });
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath("/issues");
  revalidatePath(`/datasets/${field(form, "datasetId")}`);
  redirect(`/issues/${result.issueId}`);
}

export async function issueMutationAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const issueId = field(form, "issueId");
  const operation = field(form, "operation");
  const result = operation === "status" && issueStatuses.includes(field(form, "status") as IssueStatus)
    ? await changeIssueStatus(issueId, field(form, "status") as IssueStatus, field(form, "note"))
    : operation === "assignee" ? await changeIssueAssignee(issueId, field(form, "assignee") || null)
    : operation === "severity" ? await changeIssueSeverity(issueId, field(form, "severity"))
    : operation === "comment-add" ? await addIssueComment(issueId, field(form, "content"))
    : operation === "comment-edit" ? await changeIssueComment(issueId, field(form, "commentId"), field(form, "content"))
    : operation === "comment-delete" ? await changeIssueComment(issueId, field(form, "commentId"), null)
    : { ok: false as const, error: "Invalid action." };
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath(`/issues/${issueId}`);
  revalidatePath("/issues");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  const issue = await getIssueDetail(issueId);
  if (issue) revalidatePath(`/datasets/${issue.datasetId}`);
  return { status: "success", message: "Saved." };
}
