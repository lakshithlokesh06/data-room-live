# Database Foundation

## Tables

`profiles` stores public collaboration identity for Supabase Auth users. `profiles.id` references `auth.users(id)` and is created automatically by the `public.handle_new_user()` trigger.

`workspaces` stores team review spaces with a globally unique URL-safe `slug`, creator reference, and timestamps.

`workspace_members` connects users to workspaces. A `(workspace_id, user_id)` unique constraint prevents duplicate membership, and `role` is constrained to `owner`, `admin`, `member`, or `viewer`.

`datasets` stores metadata only: workspace, name, description, original filename, future storage path, file size, row/column counts, status, uploader, and timestamps. Uploading and processing are not implemented in Phase 2.

`dataset_columns` stores future profiling metadata for each dataset column, including position, detected type, nullability, missing count, and unique count.

`data_quality_issues` stores the issue-management foundation with workspace, dataset, optional column, severity, status, assignment, creator, timestamps, and resolution timestamp.

`issue_comments` stores future issue discussion content.

`activity_events` stores workspace-scoped event metadata with JSONB payloads for future realtime feeds.

## Relationships And Constraints

All application records use UUID primary keys. Workspace-owned data cascades when a workspace is deleted. User-owned membership rows cascade when an auth user is deleted; authored workspace, dataset, issue, and comment records restrict auth-user deletion to preserve ownership history.

Important constraints include unique workspace slugs, unique workspace membership per user, supported role/status/severity checks, nonnegative file/profile counts, dataset column uniqueness by position and name, and issue resolution consistency between `status` and `resolved_at`.

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

## Helper Functions

RLS policies use `SECURITY DEFINER` helpers such as `is_workspace_member`, `workspace_member_role`, `can_manage_workspace`, `can_access_dataset`, and `can_write_issue`. They are intentionally narrow, use `auth.uid()` for the caller identity, set `search_path = public`, and avoid recursive RLS checks on `workspace_members`.

## Profile Creation Trigger

`public.handle_new_user()` runs after insert on `auth.users`. It creates a matching `profiles` row and copies `full_name` and `avatar_url` from `raw_user_meta_data` when present. The signup action passes `full_name` metadata so profiles are populated at account creation.

## Workspace Creation RPC

`public.create_workspace(workspace_name, workspace_description)` is the only intended workspace creation path. It requires an authenticated user, validates the name, generates a unique slug, inserts `workspaces`, inserts `workspace_members` with `role = 'owner'`, and returns the created workspace. Because this happens inside one PostgreSQL function, a workspace is not left behind without owner membership if membership creation fails.
