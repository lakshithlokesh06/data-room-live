# Dataset Processing

Phase 3 supports CSV upload, private Storage, and deterministic column profiling. Phase 4 adds automatic data-quality detection after profiling.

## Upload Flow

1. The user selects an uploadable workspace and CSV file on `/datasets/new`.
2. The server verifies the user is authenticated and has `owner`, `admin`, or `member` role in the selected workspace.
3. The server validates the file extension, MIME type, non-empty size, and 20 MB maximum.
4. A `datasets` row is created with `status = 'pending'`.
5. The file is uploaded to the private `datasets` bucket under `workspace_id/dataset_id/safe_filename.csv`.
6. The dataset row is updated to `status = 'processing'` with the Storage path.
7. The server parses the CSV with `csv-parse`.
8. Column metadata is computed and inserted into `dataset_columns`.
9. The dataset row is marked `ready` with row and column counts, or `failed` with a bounded `processing_error`.
10. Automatic data-quality detectors run over the parsed rows and profile output.
11. Automated issues are persisted with compact metadata and deterministic keys.
12. Activity events are recorded for upload started, ready, processing failed, quality analysis completed, and quality issues detected.

Supabase Storage and PostgreSQL writes are not atomic together. If file upload succeeds but later parsing or metadata writes fail, the app preserves the private file and marks the dataset as `failed` with a useful reason. If quality detection fails after parsing and profiling succeed, the dataset remains `ready` and automated issue persistence is isolated. No raw CSV rows are copied into PostgreSQL.

## CSV Rules

- Only `.csv` filenames are accepted.
- MIME type is checked as a useful signal, but extension validation is also required.
- Empty files are rejected.
- Files larger than 20 MB are rejected.
- Malformed CSV files are rejected during parsing.
- Headers are required, must not be blank, and must be unique case-insensitively.

## Profiling Rules

Missing values are centralized in `src/lib/datasets/constants.ts`:

- empty string
- whitespace-only string
- `null`
- `NULL`
- `NaN`
- `N/A`
- `NA`

Detected column types are deterministic:

- `integer`
- `float`
- `boolean`
- `date`
- `datetime`
- `string`

Leading-zero integer-looking values such as `00123` stay `string` so IDs and codes do not lose meaning.

## Storage Access

The `datasets` bucket is private. Viewers can read and download files for workspaces they belong to. Only owner, admin, and member roles can upload, update, or delete dataset objects.

Storage RLS does not trust filenames alone. Policies parse the object path, verify the workspace and dataset UUIDs, check the matching `datasets.storage_path`, and reuse workspace membership helpers.

## Quality Analysis

The quality engine parses once, profiles once, then runs deterministic detectors over shared data. Automated issues include source, issue type, severity, status, optional column link, and compact detection metadata. Manual issues are never deleted by automated reprocessing.

See `docs/data-quality.md` for detector thresholds, severity rules, and limitations.
