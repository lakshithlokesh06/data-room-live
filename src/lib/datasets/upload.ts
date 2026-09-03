import "server-only";

import type { ActionState } from "@/lib/auth/action-state";
import { requireUser } from "@/lib/auth/session";
import { analyzeAndPersistAutomatedIssues } from "@/lib/data-quality/persistence";
import { parseCsvBuffer } from "@/lib/datasets/csv-parser";
import { DATASET_STORAGE_BUCKET } from "@/lib/datasets/constants";
import { profileCsv } from "@/lib/datasets/profiler";
import {
  sanitizeStorageFilename,
  validateDatasetUploadInput,
} from "@/lib/datasets/validation";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/types";

type DatasetInsertRow = {
  id: string;
  workspace_id: string;
};

type DatasetColumnInsertRow = {
  id: string;
  position: number;
};

const UPLOAD_ROLES = new Set<WorkspaceRole>(["owner", "admin", "member"]);

export async function uploadDataset(formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const validation = validateDatasetUploadInput({
    workspaceId: String(formData.get("workspaceId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    file: getFormFile(formData.get("file")),
  });

  if (!validation.ok) {
    return {
      status: "error",
      message: validation.message,
      fields: validation.fields,
    };
  }

  if (!getSupabaseConfig()) {
    return {
      status: "error",
      message: "Supabase is not configured for this environment.",
      fields: {
        workspaceId: validation.data.workspaceId,
        name: validation.data.name,
        description: validation.data.description ?? "",
      },
    };
  }

  const supabase = await createClient();
  const membership = await getUploadMembership(
    validation.data.workspaceId,
    user.id
  );

  if (!membership.ok) {
    return {
      status: "error",
      message: membership.message,
      fields: {
        workspaceId: validation.data.workspaceId,
        name: validation.data.name,
        description: validation.data.description ?? "",
      },
    };
  }

  const { data: dataset, error: insertError } = await supabase
    .from("datasets")
    .insert({
      workspace_id: validation.data.workspaceId,
      name: validation.data.name,
      description: validation.data.description,
      original_filename: validation.data.file.name,
      file_size_bytes: validation.data.file.size,
      status: "pending",
      uploaded_by: user.id,
    })
    .select("id, workspace_id")
    .single<DatasetInsertRow>();

  if (insertError || !dataset) {
    return {
      status: "error",
      message: insertError?.message ?? "The dataset could not be created.",
      fields: {
        workspaceId: validation.data.workspaceId,
        name: validation.data.name,
        description: validation.data.description ?? "",
      },
    };
  }

  await recordDatasetActivity(dataset.id, "dataset.upload_started", {
    filename: validation.data.file.name,
    bytes: validation.data.file.size,
  });

  const storagePath = buildStoragePath(
    dataset.workspace_id,
    dataset.id,
    validation.data.file.name
  );
  const buffer = Buffer.from(await validation.data.file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(DATASET_STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: validation.data.file.type || "text/csv",
      upsert: false,
    });

  if (uploadError) {
    await markDatasetFailed(dataset.id, uploadError.message);
    return {
      status: "error",
      message: "The file could not be uploaded. The dataset was marked failed.",
    };
  }

  const { error: processingError } = await supabase
    .from("datasets")
    .update({ status: "processing", storage_path: storagePath })
    .eq("id", dataset.id);

  if (processingError) {
    await markDatasetFailed(dataset.id, processingError.message);
    return {
      status: "error",
      message:
        "The uploaded file was saved, but metadata processing could not start.",
    };
  }

  try {
    const parsedCsv = parseCsvBuffer(buffer);
    const profile = profileCsv(parsedCsv.headers, parsedCsv.rows);
    const columnRows = profile.columns.map((column) => ({
      dataset_id: dataset.id,
      name: column.name,
      position: column.position,
      detected_type: column.detectedType,
      nullable: column.nullable,
      missing_count: column.missingCount,
      unique_count: column.uniqueCount,
    }));

    let insertedColumns: DatasetColumnInsertRow[] = [];

    if (columnRows.length > 0) {
      const { data: columns, error: columnsError } = await supabase
        .from("dataset_columns")
        .insert(columnRows)
        .select("id, position");

      if (columnsError) {
        throw new Error(columnsError.message);
      }

      insertedColumns = (columns ?? []) as DatasetColumnInsertRow[];
    }

    const { error: readyError } = await supabase
      .from("datasets")
      .update({
        status: "ready",
        row_count: profile.rowCount,
        column_count: profile.columnCount,
        processing_error: null,
      })
      .eq("id", dataset.id);

    if (readyError) {
      throw new Error(readyError.message);
    }

    await recordDatasetActivity(dataset.id, "dataset.ready", {
      rows: profile.rowCount,
      columns: profile.columnCount,
    });

    await analyzeAndPersistAutomatedIssues({
      workspaceId: dataset.workspace_id,
      datasetId: dataset.id,
      createdBy: user.id,
      columns: insertedColumns,
      context: {
        headers: parsedCsv.headers,
        rawHeaders: parsedCsv.rawHeaders,
        rows: parsedCsv.rows,
        profile,
      },
    });

    return {
      status: "success",
      message: dataset.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The CSV could not be processed.";
    await markDatasetFailed(dataset.id, message);

    return {
      status: "error",
      message: `The file uploaded, but CSV profiling failed: ${message}`,
    };
  }
}

function getFormFile(value: FormDataEntryValue | null) {
  return value instanceof File ? value : null;
}

function buildStoragePath(
  workspaceId: string,
  datasetId: string,
  filename: string
) {
  return `${workspaceId}/${datasetId}/${sanitizeStorageFilename(filename)}`;
}

async function getUploadMembership(workspaceId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle<{ role: WorkspaceRole }>();

  if (error || !data) {
    return {
      ok: false as const,
      message: "You do not have access to upload into this workspace.",
    };
  }

  if (!UPLOAD_ROLES.has(data.role)) {
    return {
      ok: false as const,
      message: "Viewers can download datasets but cannot upload new files.",
    };
  }

  return { ok: true as const };
}

async function markDatasetFailed(datasetId: string, reason: string) {
  const supabase = await createClient();
  const safeReason = reason.slice(0, 1000);

  await supabase
    .from("datasets")
    .update({
      status: "failed",
      processing_error: safeReason,
    })
    .eq("id", datasetId);

  await recordDatasetActivity(datasetId, "dataset.processing_failed", {
    reason: safeReason,
  });
}

async function recordDatasetActivity(
  datasetId: string,
  eventType: "dataset.upload_started" | "dataset.ready" | "dataset.processing_failed",
  metadata: Record<string, unknown>
) {
  const supabase = await createClient();

  await supabase.rpc("record_dataset_activity", {
    target_dataset_id: datasetId,
    target_event_type: eventType,
    event_metadata: metadata,
  });
}
