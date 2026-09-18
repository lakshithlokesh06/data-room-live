import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  allowedTransitions, canAssignMember, canEditSeverity, canModifyComment, canWriteIssues,
  columnBelongsToDataset, statusPatch, validateComment, validateManualIssue, resolutionNoteMaxLength,
} from "@/lib/issues/workflow";
import { issueSeverities, type IssueSeverity, type IssueStatus, type WorkspaceRole } from "@/types";

export type MutationResult = { ok: true; issueId?: string } | { ok: false; error: string };
const deny = (error: string): MutationResult => ({ ok: false, error });

async function context(workspaceId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await createClient();
  const { data } = await client.from("workspace_members")
    .select("role").eq("workspace_id", workspaceId).eq("user_id", user.id)
    .maybeSingle<{ role: WorkspaceRole }>();
  return data ? { user, role: data.role, client } : null;
}

async function issueContext(issueId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await createClient();
  const { data: issue } = await client.from("data_quality_issues")
    .select("id, workspace_id, dataset_id, status, severity, assigned_to, updated_at")
    .eq("id", issueId).maybeSingle<{
      id: string; workspace_id: string; dataset_id: string; status: IssueStatus;
      severity: IssueSeverity; assigned_to: string | null; updated_at: string;
    }>();
  if (!issue) return null;
  const access = await context(issue.workspace_id);
  return access ? { ...access, issue } : null;
}

async function activity(workspaceId: string, actorId: string, issueId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  await createServiceRoleClient().from("activity_events").insert({
    workspace_id: workspaceId, actor_id: actorId, event_type: eventType,
    entity_type: "issue", entity_id: issueId, metadata,
  });
}

export async function createManualIssue(input: {
  datasetId: string; columnId: string | null; title: string; description: string;
  issueType: string; severity: string;
}): Promise<MutationResult> {
  const validation = validateManualIssue(input);
  if (validation) return deny(validation);
  const user = await getCurrentUser();
  if (!user) return deny("Sign in to create an issue.");
  const client = await createClient();
  const { data: dataset } = await client.from("datasets").select("id, workspace_id")
    .eq("id", input.datasetId).maybeSingle<{ id: string; workspace_id: string }>();
  if (!dataset) return deny("Dataset not found.");
  const access = await context(dataset.workspace_id);
  if (!access || !canWriteIssues(access.role)) return deny("You cannot create issues in this workspace.");
  if (input.columnId) {
    const { data: column } = await client.from("dataset_columns").select("dataset_id")
      .eq("id", input.columnId).eq("dataset_id", dataset.id).maybeSingle();
    if (!columnBelongsToDataset(dataset.id, column)) return deny("Select a column from this dataset.");
  }
  const admin = createServiceRoleClient();
  const { data, error } = await admin.from("data_quality_issues").insert({
    workspace_id: dataset.workspace_id, dataset_id: dataset.id, column_id: input.columnId,
    title: input.title.trim(), description: input.description.trim() || null,
    issue_type: input.issueType, severity: input.severity,
    status: "open", assigned_to: null, created_by: user.id, source: "manual",
  }).select("id").single<{ id: string }>();
  if (error || !data) return deny("Could not create issue.");
  await activity(dataset.workspace_id, user.id, data.id, "issue.created");
  return { ok: true, issueId: data.id };
}

export async function changeIssueStatus(issueId: string, next: IssueStatus, note: string): Promise<MutationResult> {
  const access = await issueContext(issueId);
  if (!access || !canWriteIssues(access.role)) return deny("You cannot change this issue.");
  const { issue, user } = access;
  if (!allowedTransitions[issue.status].includes(next)) return deny("This status transition is no longer available. Refresh the page.");
  if (note.trim().length > resolutionNoteMaxLength) return deny("Resolution note must be 1,000 characters or fewer.");
  const { data, error } = await createServiceRoleClient().from("data_quality_issues")
    .update(statusPatch(next, user.id, note, new Date().toISOString()))
    .eq("id", issue.id).eq("status", issue.status).eq("updated_at", issue.updated_at)
    .select("id").maybeSingle();
  if (error || !data) return deny("Issue changed elsewhere. Refresh and try again.");
  const event = next === "resolved" ? "issue.resolved" : next === "dismissed" ? "issue.dismissed" : issue.status === "resolved" || issue.status === "dismissed" ? "issue.reopened" : "issue.status_changed";
  await activity(issue.workspace_id, user.id, issue.id, event, { previous_status: issue.status, new_status: next });
  return { ok: true };
}

export async function changeIssueAssignee(issueId: string, assigneeId: string | null): Promise<MutationResult> {
  const access = await issueContext(issueId);
  if (!access || !canWriteIssues(access.role)) return deny("You cannot assign this issue.");
  const { issue, user, client } = access;
  if (assigneeId) {
    const { data } = await client.from("workspace_members").select("workspace_id, user_id")
      .eq("workspace_id", issue.workspace_id).eq("user_id", assigneeId).maybeSingle();
    if (!canAssignMember(issue.workspace_id, assigneeId, data)) return deny("Assignee must belong to this workspace.");
  }
  if (issue.assigned_to === assigneeId) return { ok: true };
  const { data, error } = await createServiceRoleClient().from("data_quality_issues")
    .update({ assigned_to: assigneeId }).eq("id", issue.id).eq("updated_at", issue.updated_at)
    .select("id").maybeSingle();
  if (error || !data) return deny("Issue changed elsewhere. Refresh and try again.");
  await activity(issue.workspace_id, user.id, issue.id, assigneeId ? "issue.assigned" : "issue.unassigned", {
    previous_assignee_id: issue.assigned_to, assignee_id: assigneeId,
  });
  return { ok: true };
}

export async function changeIssueSeverity(issueId: string, severity: string): Promise<MutationResult> {
  const access = await issueContext(issueId);
  if (!access || !canEditSeverity(access.role)) return deny("Only owners and admins can change severity.");
  if (!issueSeverities.includes(severity as IssueSeverity)) return deny("Select a valid severity.");
  const { issue, user } = access;
  if (issue.severity === severity) return { ok: true };
  const { data, error } = await createServiceRoleClient().from("data_quality_issues")
    .update({ severity }).eq("id", issue.id).eq("updated_at", issue.updated_at)
    .select("id").maybeSingle();
  if (error || !data) return deny("Issue changed elsewhere. Refresh and try again.");
  await activity(issue.workspace_id, user.id, issue.id, "issue.severity_changed", {
    previous_severity: issue.severity, new_severity: severity,
  });
  return { ok: true };
}

export async function addIssueComment(issueId: string, content: string): Promise<MutationResult> {
  const access = await issueContext(issueId);
  if (!access || !canWriteIssues(access.role)) return deny("You cannot comment on this issue.");
  const validation = validateComment(content);
  if (validation) return deny(validation);
  const { issue, user } = access;
  const { error } = await createServiceRoleClient().from("issue_comments")
    .insert({ issue_id: issue.id, author_id: user.id, content: content.trim() });
  if (error) return deny("Could not add comment.");
  await activity(issue.workspace_id, user.id, issue.id, "issue.comment_added");
  return { ok: true };
}

export async function changeIssueComment(issueId: string, commentId: string, content: string | null): Promise<MutationResult> {
  const access = await issueContext(issueId);
  if (!access) return deny("Issue not found.");
  const { data: comment } = await access.client.from("issue_comments")
    .select("id, author_id, updated_at").eq("id", commentId).eq("issue_id", issueId)
    .maybeSingle<{ id: string; author_id: string; updated_at: string }>();
  if (!comment || !canModifyComment(access.role, comment.author_id, access.user.id)) return deny("You can only change your own comments.");
  if (content !== null) {
    const validation = validateComment(content);
    if (validation) return deny(validation);
  }
  const admin = createServiceRoleClient();
  const query = content === null ? admin.from("issue_comments").delete() : admin.from("issue_comments").update({ content: content.trim() });
  const { data, error } = await query.eq("id", commentId).eq("issue_id", issueId)
    .eq("author_id", access.user.id).eq("updated_at", comment.updated_at).select("id").maybeSingle();
  if (error || !data) return deny("Comment changed elsewhere. Refresh and try again.");
  await activity(access.issue.workspace_id, access.user.id, issueId,
    content === null ? "issue.comment_deleted" : "issue.comment_edited");
  return { ok: true };
}
