# Automated Data Quality Detection

Phase 4 runs deterministic quality detectors after CSV parsing and column profiling. Detectors use the already parsed rows and profile output; the CSV is not reparsed per detector.

## Issue Types

Automated issues use these stable `issue_type` values:

- `missing_values`
- `duplicate_rows`
- `constant_column`
- `high_cardinality`
- `mixed_types`
- `numeric_outliers`
- `inconsistent_categories`
- `invalid_dates`
- `whitespace_anomaly`
- `unnamed_column`

The Phase 4 migration adds a database CHECK constraint for these values. Future phases can extend the constraint with new issue types through another migration.

## Severity Model

Severity is deterministic and conservative.

- Missing values: `low` at 1%, `medium` at 10%, `high` at 30%, `critical` at 75%.
- Duplicate rows: `medium` at 1%, `high` at 10%, `critical` at 35%.
- Constant columns: usually `low`; `medium` when populated and missing values coexist.
- Mixed types: `medium` by default, `high` at 10% inconsistent populated values.
- Numeric outliers: `medium` by default, `high` at 10% outlier ratio.
- Category, whitespace, date, high-cardinality, and unnamed-column findings are `low` or `medium`.

`critical` is reserved for severe dataset-wide risk such as very high missingness or duplicate ratios.

## Detector Rules

Missing values reuse the same normalization as profiling: blank strings, whitespace-only strings, `null`, `NULL`, `NaN`, `N/A`, and `NA`. A column is flagged only at or above the configured 1% threshold.

Duplicate rows are exact data-row duplicates. The header is excluded, completely missing rows are ignored, and raw duplicate rows are not stored.

Constant columns are flagged when every non-missing value in a column is identical. Fully missing columns are not treated as ordinary constant columns.

High-cardinality text columns are flagged when row count, unique count, and uniqueness ratio are all high. Identifier-like names such as `id`, `customer_id`, `uuid`, `key`, and `code` are suppressed because high uniqueness is expected.

Mixed types inspect populated cells directly. Numeric, date, and boolean dominant representations are flagged when incompatible text or other representations appear in the same column.

Numeric outliers use the transparent IQR rule: values below `Q1 - 1.5 * IQR` or above `Q3 + 1.5 * IQR` are counted as possible outliers. The detector requires at least 8 numeric samples and stores counts/fences, not raw values.

Category consistency detects clear normalization collisions from case and surrounding whitespace differences, such as `Active`, `active`, and ` Active`. It does not fuzzy-match or merge genuinely different categories.

Date consistency looks for a dominant parseable date-like representation and flags minority values that do not parse consistently. It does not infer locales or attempt complex date repair.

Whitespace anomalies count leading or trailing whitespace in string-like columns. Internal spaces are not flagged.

Unnamed columns are detected from raw headers that are empty, whitespace-only, or obvious generated names such as `Unnamed 1`.

## Metadata Strategy

Phase 4 adds:

- `source`: `manual` or `automated`
- `detection_metadata`: compact JSONB detector summaries
- `automated_issue_key`: deterministic key for automated findings

Automated metadata stores counts, percentages, method names, and column references. It does not store raw CSV rows, raw duplicate rows, secrets, or full category lists.

## Creator Strategy

`data_quality_issues.created_by` remains required and references an Auth user. Automated issues use the dataset uploader as `created_by` and `source = 'automated'`. This preserves existing ownership constraints without inventing a system user UUID.

## Idempotency

Automated issue persistence clears and recreates only `source = 'automated'` issues for the processed dataset. Manual issues are never deleted by reprocessing. `automated_issue_key` is also indexed to guard against duplicate automated findings.

## Failure Isolation

Parsing and profiling success is not lost if quality detection or persistence fails. The dataset remains `ready`; detector failures are captured by the engine, and persistence failures are isolated from the upload result. Stack traces are not exposed to users.

## Authorization

All workspace members, including viewers, may read quality issues through existing RLS. Direct client inserts and updates are restricted to `source = 'manual'`, so clients cannot forge automated issues. Automated issue creation uses the server-only Supabase service-role client after the upload flow has already validated the authenticated user can write to the dataset workspace.

## Performance Notes

The dataset limit remains 20 MB. The pipeline parses once, profiles once, and runs detectors over shared row/profile data. Duplicate detection uses a row hash map. Cardinality and category checks use sets/maps. There are no O(n²) detectors in Phase 4.

## Limitations

These findings are review signals, not proofs of data errors. High-cardinality, category consistency, date consistency, and outlier detectors may produce false positives in legitimate datasets. Later phases should let users dismiss or resolve issues manually.
