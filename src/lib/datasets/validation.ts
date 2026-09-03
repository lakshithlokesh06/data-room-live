import { CSV_MIME_TYPES, MAX_CSV_UPLOAD_BYTES } from "@/lib/datasets/constants";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DatasetUploadInput = {
  workspaceId: string;
  name: string;
  description?: string | null;
  file: File | null | undefined;
};

export type ValidDatasetUploadInput = {
  workspaceId: string;
  name: string;
  description: string | null;
  file: File;
};

export function validateDatasetUploadInput(input: DatasetUploadInput) {
  const workspaceId = input.workspaceId.trim();
  const name = input.name.trim();
  const description = input.description?.trim() || null;
  const fileValidation = validateCsvFile(input.file);

  if (!UUID_PATTERN.test(workspaceId)) {
    return {
      ok: false as const,
      message: "Choose a workspace before uploading a dataset.",
      fields: { workspaceId, name, description: description ?? "" },
    };
  }

  if (name.length < 1 || name.length > 160) {
    return {
      ok: false as const,
      message: "Dataset name must be between 1 and 160 characters.",
      fields: { workspaceId, name, description: description ?? "" },
    };
  }

  if (description && description.length > 1000) {
    return {
      ok: false as const,
      message: "Description must be 1000 characters or fewer.",
      fields: { workspaceId, name, description },
    };
  }

  if (!fileValidation.ok) {
    return {
      ok: false as const,
      message: fileValidation.message,
      fields: { workspaceId, name, description: description ?? "" },
    };
  }

  return {
    ok: true as const,
    data: {
      workspaceId,
      name,
      description,
      file: fileValidation.file,
    } satisfies ValidDatasetUploadInput,
  };
}

export function validateCsvFile(file: File | null | undefined) {
  if (!file || file.size === 0) {
    return {
      ok: false as const,
      message: "Choose a non-empty CSV file.",
    };
  }

  if (file.size > MAX_CSV_UPLOAD_BYTES) {
    return {
      ok: false as const,
      message: `CSV files must be ${formatBytes(MAX_CSV_UPLOAD_BYTES)} or smaller.`,
    };
  }

  if (!hasCsvExtension(file.name)) {
    return {
      ok: false as const,
      message: "Only .csv files can be uploaded.",
    };
  }

  if (!CSV_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      ok: false as const,
      message: "The selected file does not look like a CSV.",
    };
  }

  return { ok: true as const, file };
}

export function hasCsvExtension(filename: string) {
  return filename.trim().toLowerCase().endsWith(".csv");
}

export function sanitizeStorageFilename(filename: string) {
  const safeName = filename
    .trim()
    .replace(/[/\\]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 160);

  if (!safeName || !hasCsvExtension(safeName)) {
    return `dataset-${Date.now()}.csv`;
  }

  return safeName;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
