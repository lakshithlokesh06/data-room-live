import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import {
  DATASET_STORAGE_BUCKET,
  SIGNED_DOWNLOAD_URL_TTL_SECONDS,
} from "@/lib/datasets/constants";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { DatasetStatus, WorkspaceRole } from "@/types";

const UPLOAD_ROLES = ["owner", "admin", "member"] satisfies WorkspaceRole[];

type DatasetRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  original_filename: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  status: DatasetStatus;
  row_count: number | null;
  column_count: number | null;
  processing_error: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

type DatasetColumnRow = {
  id: string;
  dataset_id: string;
  name: string;
  position: number;
  detected_type: string | null;
  nullable: boolean;
  missing_count: number | null;
  unique_count: number | null;
  created_at: string;
};

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type UploadableWorkspaceMembershipRow = {
  workspace_id: string;
  role: WorkspaceRole;
};

export type DatasetListItem = ReturnType<typeof mapDatasetRow> & {
  workspaceName: string;
  uploaderName: string;
};

export type DatasetDetail = DatasetListItem & {
  workspaceSlug: string;
  columns: ReturnType<typeof mapDatasetColumnRow>[];
};

export type UploadableWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
};

export async function listAccessibleDatasets(): Promise<DatasetListItem[]> {
  if (!getSupabaseConfig()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datasets")
    .select(
      "id, workspace_id, name, description, original_filename, storage_path, file_size_bytes, status, row_count, column_count, processing_error, uploaded_by, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rows = data as DatasetRow[];
  const [workspaces, profiles] = await Promise.all([
    getWorkspaces(rows.map((row) => row.workspace_id)),
    getProfiles(rows.map((row) => row.uploaded_by)),
  ]);

  return rows.map((row) => {
    const workspace = workspaces.get(row.workspace_id);
    const uploader = profiles.get(row.uploaded_by);

    return {
      ...mapDatasetRow(row),
      workspaceName: workspace?.name ?? "Unknown workspace",
      uploaderName: uploader?.full_name ?? "Unknown user",
    };
  });
}

export async function listUploadableWorkspaces(): Promise<UploadableWorkspace[]> {
  const user = await getCurrentUser();

  if (!user || !getSupabaseConfig()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .in("role", UPLOAD_ROLES);

  if (error || !data || data.length === 0) {
    return [];
  }

  const memberships = data as UploadableWorkspaceMembershipRow[];
  const workspaces = await getWorkspaces(
    memberships.map((membership) => membership.workspace_id)
  );

  return memberships.flatMap((membership) => {
    const workspace = workspaces.get(membership.workspace_id);

    if (!workspace) {
      return [];
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: membership.role,
    };
  });
}

export async function getDatasetDetail(
  datasetId: string
): Promise<DatasetDetail | null> {
  if (!getSupabaseConfig()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datasets")
    .select(
      "id, workspace_id, name, description, original_filename, storage_path, file_size_bytes, status, row_count, column_count, processing_error, uploaded_by, created_at, updated_at"
    )
    .eq("id", datasetId)
    .maybeSingle<DatasetRow>();

  if (error || !data) {
    return null;
  }

  const [workspaces, profiles, columns] = await Promise.all([
    getWorkspaces([data.workspace_id]),
    getProfiles([data.uploaded_by]),
    getDatasetColumns(data.id),
  ]);
  const workspace = workspaces.get(data.workspace_id);
  const uploader = profiles.get(data.uploaded_by);

  return {
    ...mapDatasetRow(data),
    workspaceName: workspace?.name ?? "Unknown workspace",
    workspaceSlug: workspace?.slug ?? "",
    uploaderName: uploader?.full_name ?? "Unknown user",
    columns,
  };
}

export async function createDatasetDownloadUrl(datasetId: string) {
  const user = await getCurrentUser();

  if (!user || !getSupabaseConfig()) {
    return {
      ok: false as const,
      status: 401,
      message: "Authentication required.",
    };
  }

  const detail = await getDatasetDetail(datasetId);

  if (!detail || !detail.storagePath) {
    return {
      ok: false as const,
      status: 404,
      message: "Dataset file not found.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(DATASET_STORAGE_BUCKET)
    .createSignedUrl(detail.storagePath, SIGNED_DOWNLOAD_URL_TTL_SECONDS, {
      download: detail.originalFilename ?? `${detail.name}.csv`,
    });

  if (error || !data?.signedUrl) {
    return {
      ok: false as const,
      status: 403,
      message: "You are not allowed to download this dataset.",
    };
  }

  return {
    ok: true as const,
    signedUrl: data.signedUrl,
  };
}

async function getDatasetColumns(datasetId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dataset_columns")
    .select(
      "id, dataset_id, name, position, detected_type, nullable, missing_count, unique_count, created_at"
    )
    .eq("dataset_id", datasetId)
    .order("position", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as DatasetColumnRow[]).map(mapDatasetColumnRow);
}

async function getWorkspaces(workspaceIds: string[]) {
  const ids = unique(workspaceIds);
  const workspaces = new Map<string, WorkspaceRow>();

  if (ids.length === 0) {
    return workspaces;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .in("id", ids);

  for (const workspace of (data ?? []) as WorkspaceRow[]) {
    workspaces.set(workspace.id, workspace);
  }

  return workspaces;
}

async function getProfiles(userIds: string[]) {
  const ids = unique(userIds);
  const profiles = new Map<string, ProfileRow>();

  if (ids.length === 0) {
    return profiles;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);

  for (const profile of (data ?? []) as ProfileRow[]) {
    profiles.set(profile.id, profile);
  }

  return profiles;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function mapDatasetRow(row: DatasetRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    originalFilename: row.original_filename,
    storagePath: row.storage_path,
    fileSizeBytes: row.file_size_bytes,
    status: row.status,
    rowCount: row.row_count,
    columnCount: row.column_count,
    processingError: row.processing_error,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDatasetColumnRow(row: DatasetColumnRow) {
  return {
    id: row.id,
    datasetId: row.dataset_id,
    name: row.name,
    position: row.position,
    detectedType: row.detected_type,
    nullable: row.nullable,
    missingCount: row.missing_count,
    uniqueCount: row.unique_count,
    createdAt: row.created_at,
  };
}
