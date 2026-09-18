import { describe, expect, it } from "vitest";
import { allowedTransitions, canAssignMember, canEditSeverity, canModifyComment, canTransition, canWriteIssues, columnBelongsToDataset, statusPatch, validateComment, validateManualIssue } from "./workflow";

describe("issue workflow", () => {
  it("allows only the intended status transitions", () => {
    expect(allowedTransitions).toEqual({
      open: ["in_progress", "resolved", "dismissed"],
      in_progress: ["open", "resolved", "dismissed"],
      resolved: ["open"], dismissed: ["open"],
    });
    expect(canTransition("resolved", "dismissed")).toBe(false);
    expect(canTransition("dismissed", "open")).toBe(true);
  });
  it("keeps viewers read-only and limits severity to managers", () => {
    expect(canWriteIssues("owner")).toBe(true);
    expect(canWriteIssues("admin")).toBe(true);
    expect(canWriteIssues("member")).toBe(true);
    expect(canWriteIssues("viewer")).toBe(false);
    expect(canEditSeverity("member")).toBe(false);
    expect(canEditSeverity("admin")).toBe(true);
    expect(canEditSeverity("owner")).toBe(true);
  });
  it("validates controlled manual issues", () => {
    const valid = { title: "Review customer keys", description: "", issueType: "manual_review", severity: "medium" };
    expect(validateManualIssue(valid)).toBeNull();
    expect(validateManualIssue({ ...valid, title: " " })).toMatch(/Title/);
    expect(validateManualIssue({ ...valid, issueType: "invented" })).toMatch(/type/);
    expect(validateManualIssue({ ...valid, severity: "urgent" })).toMatch(/severity/);
  });
  it("validates comments and own-comment permissions", () => {
    expect(validateComment(" Useful context ")).toBeNull();
    expect(validateComment(" ")).toMatch(/empty/);
    expect(validateComment("x".repeat(5001))).toMatch(/5,000/);
    expect(canModifyComment("member", "author", "author")).toBe(true);
    expect(canModifyComment("member", "author", "other")).toBe(false);
    expect(canModifyComment("viewer", "author", "author")).toBe(false);
  });
  it("restricts assignment and columns to their workspace or dataset", () => {
    expect(canAssignMember("workspace", "alice", { workspace_id: "workspace", user_id: "alice" })).toBe(true);
    expect(canAssignMember("workspace", "alice", { workspace_id: "other", user_id: "alice" })).toBe(false);
    expect(canAssignMember("workspace", "alice", null)).toBe(false);
    expect(canAssignMember("workspace", null, null)).toBe(true);
    expect(columnBelongsToDataset("dataset", { dataset_id: "dataset" })).toBe(true);
    expect(columnBelongsToDataset("dataset", { dataset_id: "other" })).toBe(false);
  });
  it("sets resolution attribution and clears it on reopen", () => {
    expect(statusPatch("resolved", "actor", " Done ", "2026-09-18T00:00:00Z")).toEqual({
      status: "resolved", resolved_at: "2026-09-18T00:00:00Z", resolved_by: "actor", resolution_note: "Done",
    });
    expect(statusPatch("dismissed", "actor", "", "2026-09-18T00:00:00Z").resolved_by).toBe("actor");
    expect(statusPatch("open", "actor", "old note", "2026-09-18T00:00:00Z")).toEqual({
      status: "open", resolved_at: null, resolved_by: null, resolution_note: null,
    });
  });
});
