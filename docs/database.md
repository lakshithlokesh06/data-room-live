# Database Foundation

## Tables

`profiles` stores public collaboration identity for Supabase Auth users. `profiles.id` references `auth.users(id)` and is created automatically by the `public.handle_new_user()` trigger.

`workspaces` stores team review spaces with a globally unique URL-safe `slug`, creator reference, and timestamps.

`workspace_members` connects users to workspaces. A `(workspace_id, user_id)` unique constraint prevents duplicate membership, and `role` is constrained to `owner`, `admin`, `member`, or `viewer`.

`datasets` stores metadata only: workspace, name, description, original filename, private Storage path, file size, row/column counts, processing status, processing error, uploader, and timestamps. Raw CSV rows are stored only in Supabase Storage, not in PostgreSQL.

`dataset_columns` stores profiling metadata for each dataset column, including position, detected type, nullability, missing count, and unique count.

`data_quality_issues` stores the issue-management foundation with workspace, dataset, optional column, stable issue type, severity, status, assignment, creator, source, compact detection metadata, automated issue key, timestamps, and resolution timestamp.

`issue_comments` stores future issue discussion content.

`activity_events` stores workspace-scoped event metadata with JSONB payloads for future realtime feeds.

## Relationships And Constraints

All application records use UUID primary keys. Workspace-owned data cascades when a workspace is deleted. User-owned membership rows cascade when an auth user is deleted; authored workspace, dataset, issue, and comment records restrict auth-user deletion to preserve ownership history.

Important constraints include unique workspace slugs, unique workspace membership per user, supported role/status/severity/source checks, stable automated issue type checks, nonnegative file/profile counts, dataset column uniqueness by position and name, immutable dataset workspace/uploader identity, automated issue key consistency, and issue resolution consistency between `status` and `resolved_at`.

## Role Model

`owner` is created only by the workspace RPC. `admin` can manage workspace settings and non-owner membership through RLS. `member` can write workspace review data such as datasets, columns, issues, and comments. `viewer` is read-only.

## RLS Strategy

RLS is enabled on every application table. Access derives from workspace membership:

- Profiles are readable by authenticated users and updatable only by the matching user.
- Workspaces are readable by members and mutable by owners/admins.
- Membership is readable by workspace members and mutable by owners/admins for non-owner rows.
- Datasets and dataset columns are readable by workspace members; viewers cannot write.
- Issues and comments are readable by workspace members; viewers cannot write.
- Activity events are readable by workspace members and have no client insert/update/delete policy.
- Dataset Storage objects are readable by workspace members through private Storage policies. Upload, update, and delete are limited to owner, admin, and member roles and require a matching dataset row and path.
- Direct client inserts and updates to `data_quality_issues` are limited to `source = 'manual'`. Automated issues are created by server-only code after authorization checks.

## Helper Functions

RLS policies use `SECURITY DEFINER` helpers such as `is_workspace_member`, `workspace_member_role`, `can_manage_workspace`, `can_access_dataset`, and `can_write_issue`. They are intentionally narrow, use `auth.uid()` for the caller identity, set `search_path = public`, and avoid recursive RLS checks on `workspace_members`.

Phase 3 adds Storage-specific helpers: `try_parse_uuid`, `dataset_storage_workspace_id`, `dataset_storage_dataset_id`, `can_read_dataset_object`, `can_upload_dataset_object`, and `can_write_dataset_object`. These helpers prevent crafted Storage paths from bypassing membership checks.

## Profile Creation Trigger

`public.handle_new_user()` runs after insert on `auth.users`. It creates a matching `profiles` row and copies `full_name` and `avatar_url` from `raw_user_meta_data` when present. The signup action passes `full_name` metadata so profiles are populated at account creation.

## Workspace Creation RPC

`public.create_workspace(workspace_name, workspace_description)` is the only intended workspace creation path. It requires an authenticated user, validates the name, generates a unique slug, inserts `workspaces`, inserts `workspace_members` with `role = 'owner'`, and returns the created workspace. Because this happens inside one PostgreSQL function, a workspace is not left behind without owner membership if membership creation fails.

## Dataset Activity RPC

`public.record_dataset_activity(target_dataset_id, target_event_type, event_metadata)` records dataset upload lifecycle events for authenticated workspace writers. Supported event types are `dataset.upload_started`, `dataset.ready`, and `dataset.processing_failed`. Payloads contain operational metadata such as filename, byte size, row count, column count, or a bounded failure reason. They must not contain secrets or raw CSV content.

Phase 4 extends dataset activity with `dataset.quality_analysis_completed` and `dataset.quality_issues_detected`. Those events store issue counts and severity summaries only.

## Automated Issue Metadata

Automated quality issues use `source = 'automated'`, a deterministic `automated_issue_key`, and compact `detection_metadata`. The uploader remains `created_by` so the existing non-null Auth foreign key is preserved without a fake system user. Reprocessing clears and recreates only automated issues for the dataset; manual issues are untouched.
