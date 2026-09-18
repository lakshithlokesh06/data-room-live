export function describeActivity(event: { event_type: string; metadata: Record<string, unknown> }) {
  const value = (key: string) => String(event.metadata[key] ?? "").replaceAll("_", " ");
  switch (event.event_type) {
    case "issue.created": return "created the issue";
    case "issue.assigned": return "assigned the issue";
    case "issue.unassigned": return "unassigned the issue";
    case "issue.status_changed": return `changed status from ${value("previous_status")} to ${value("new_status")}`;
    case "issue.resolved": return "resolved the issue";
    case "issue.dismissed": return "dismissed the issue";
    case "issue.reopened": return "reopened the issue";
    case "issue.severity_changed": return `changed severity from ${value("previous_severity")} to ${value("new_severity")}`;
    case "issue.comment_added": return "added a comment";
    case "issue.comment_edited": return "edited a comment";
    case "issue.comment_deleted": return "deleted a comment";
    case "dataset.registered": return "registered a dataset";
    case "dataset.upload_started": return "started a dataset upload";
    case "dataset.ready": return "completed dataset processing";
    case "dataset.processing_failed": return "encountered a processing error";
    case "dataset.quality_analysis_completed": return "completed quality analysis";
    case "dataset.quality_issues_detected": return "detected quality findings";
    case "workspace.created": return "created a workspace";
    default: return "updated the workspace";
  }
}
