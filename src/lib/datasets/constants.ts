export const DATASET_STORAGE_BUCKET = "datasets";
export const MAX_CSV_UPLOAD_BYTES = 20 * 1024 * 1024;
export const SIGNED_DOWNLOAD_URL_TTL_SECONDS = 60;

export const MISSING_VALUE_TOKENS = new Set([
  "",
  "null",
  "nan",
  "n/a",
  "na",
]);

export const CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "",
]);
