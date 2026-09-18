import {
  issueSeverities, manualIssueTypes, type IssueSeverity, type IssueStatus,
  type WorkspaceRole, type ManualIssueType,
} from "@/types";

export const commentMaxLength = 5000;
export const resolutionNoteMaxLength = 1000;

export const allowedTransitions: Record<IssueStatus, readonly IssueStatus[]> = {
  open: ["in_progress", "resolved", "dismissed"],
  in_progress: ["open", "resolved", "dismissed"],
  resolved: ["open"],
  dismissed: ["open"],
};

export function canTransition(from: IssueStatus, to: IssueStatus) {
  return allowedTransitions[from].includes(to);
}

export function canWriteIssues(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function canEditSeverity(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function validateManualIssue(input: {
  title: string; description: string; issueType: string; severity: string;
}): string | null {
  if (input.title.trim().length < 3 || input.title.trim().length > 180) return "Title must be 3 to 180 characters.";
  if (input.description.trim().length > 5000) return "Description must be 5,000 characters or fewer.";
  if (!manualIssueTypes.includes(input.issueType as ManualIssueType)) return "Select a valid issue type.";
  if (!issueSeverities.includes(input.severity as IssueSeverity)) return "Select a valid severity.";
  return null;
}

export function validateComment(content: string): string | null {
  const length = content.trim().length;
  if (length === 0) return "Comment cannot be empty.";
  if (length > commentMaxLength) return `Comment must be ${commentMaxLength.toLocaleString()} characters or fewer.`;
  return null;
}

export function canModifyComment(role: WorkspaceRole | null, authorId: string, actorId: string) {
  return canWriteIssues(role) && authorId === actorId;
}

export function canAssignMember(workspaceId: string, assigneeId: string | null, member: { workspace_id: string; user_id: string } | null) {
  return assigneeId === null || (member?.workspace_id === workspaceId && member.user_id === assigneeId);
}

export function columnBelongsToDataset(datasetId: string, column: { dataset_id: string } | null) {
  return column?.dataset_id === datasetId;
}

export function statusPatch(next: IssueStatus, actorId: string, note: string, now: string) {
  const closed = next === "resolved" || next === "dismissed";
  return {
    status: next,
    resolved_at: closed ? now : null,
    resolved_by: closed ? actorId : null,
    resolution_note: closed ? note.trim() || null : null,
  };
}
