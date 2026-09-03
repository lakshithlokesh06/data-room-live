import "server-only";

import { runDataQualityDetection } from "@/lib/data-quality/engine";
import type {
  DataQualityDetectionContext,
  DataQualityDetectionResult,
} from "@/lib/data-quality/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { IssueSeverity } from "@/types";

type DatasetColumnReference = {
  id: string;
  position: number;
};

type PersistAutomatedIssuesInput = {
  workspaceId: string;
  datasetId: string;
  createdBy: string;
  columns: DatasetColumnReference[];
  context: DataQualityDetectionContext;
};

export async function analyzeAndPersistAutomatedIssues({
  workspaceId,
  datasetId,
  createdBy,
  columns,
  context,
}: PersistAutomatedIssuesInput) {
  const detection = runDataQualityDetection(context);

  try {
    const supabase = createServiceRoleClient();
    const columnIdsByPosition = new Map(
      columns.map((column) => [column.position, column.id])
    );
    const rows = detection.issues.map((issue) => ({
      workspace_id: workspaceId,
      dataset_id: datasetId,
      column_id:
        issue.columnPosition === null
          ? null
          : columnIdsByPosition.get(issue.columnPosition) ?? null,
      title: issue.title,
      description: issue.description,
      issue_type: issue.issueType,
      severity: issue.severity,
      status: "open",
      assigned_to: null,
      created_by: createdBy,
      source: "automated",
      detection_metadata: issue.metadata,
      automated_issue_key: issue.fingerprint,
    }));

    const { error: deleteError } = await supabase
      .from("data_quality_issues")
      .delete()
      .eq("dataset_id", datasetId)
      .eq("source", "automated");

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("data_quality_issues")
        .insert(rows);

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    await recordQualityActivity({
      workspaceId,
      datasetId,
      issueCount: detection.issues.length,
      severitySummary: summarizeSeverity(detection.issues),
      detectorFailureCount: detection.failures.length,
    });
  } catch {
    return {
      ok: false as const,
      issues: detection.issues,
      failures: detection.failures,
    };
  }

  return {
    ok: true as const,
    issues: detection.issues,
    failures: detection.failures,
  };
}

async function recordQualityActivity({
  workspaceId,
  datasetId,
  issueCount,
  severitySummary,
  detectorFailureCount,
}: {
  workspaceId: string;
  datasetId: string;
  issueCount: number;
  severitySummary: Record<IssueSeverity, number>;
  detectorFailureCount: number;
}) {
  const supabase = createServiceRoleClient();
  const metadata = {
    issue_count: issueCount,
    severity_summary: severitySummary,
    detector_failure_count: detectorFailureCount,
  };

  const { error: completedError } = await supabase.from("activity_events").insert({
    workspace_id: workspaceId,
    actor_id: null,
    event_type: "dataset.quality_analysis_completed",
    entity_type: "dataset",
    entity_id: datasetId,
    metadata,
  });

  if (completedError) {
    throw new Error(completedError.message);
  }

  if (issueCount > 0) {
    const { error: detectedError } = await supabase.from("activity_events").insert({
      workspace_id: workspaceId,
      actor_id: null,
      event_type: "dataset.quality_issues_detected",
      entity_type: "dataset",
      entity_id: datasetId,
      metadata,
    });

    if (detectedError) {
      throw new Error(detectedError.message);
    }
  }
}

function summarizeSeverity(issues: DataQualityDetectionResult[]) {
  return issues.reduce<Record<IssueSeverity, number>>(
    (summary, issue) => {
      summary[issue.severity] += 1;
      return summary;
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  );
}
