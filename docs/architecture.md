# DataRoom Live Architecture

## Frontend Architecture

DataRoom Live uses Next.js 16 with the App Router and a `src/` application structure. Pages are Server Components by default, with client boundaries reserved for interactive UI such as navigation menus, auth forms, and workspace creation forms. The root layout owns global metadata, the sticky navigation shell, Tailwind/shadcn theme tokens, the shared tooltip provider, and the authenticated user lookup used by the header.

The initial route structure is intentionally small:

- `/` presents the product landing page and feature preview.
- `/login` and `/signup` provide Supabase email/password authentication.
- `/auth/callback` exchanges Supabase email confirmation codes for SSR sessions.
- `/dashboard`, `/workspaces`, `/datasets`, and `/activity` are protected by the `(dashboard)` route-group layout.
- `/workspaces` lists RLS-visible workspaces and creates new workspaces through the database RPC.
- `/datasets` lists RLS-visible datasets across the user's workspaces.
- `/datasets/new` uploads CSV files for owner, admin, and member roles.
- `/datasets/[datasetId]` shows dataset metadata and stored column profiling.
- `/datasets/[datasetId]/download` checks membership and redirects to a short-lived signed Storage URL.

Reusable UI is split into `src/components/ui` for shadcn primitives, `src/components/layout` for app chrome, `src/components/auth` for auth forms, `src/components/workspaces` for workspace-specific UI, `src/components/datasets` for dataset-specific upload and status components, and `src/components/shared` for reusable product building blocks.

## API Architecture

API work uses Next.js Route Handlers under `src/app/api`, `src/app/auth`, and protected route groups. The `/api/health` route verifies the route-handler surface without business logic. The `/auth/callback` route handles Supabase PKCE/email confirmation callbacks. The dataset download route delegates authorization and signed URL creation to `src/lib/datasets/queries.ts`. Future API routes should stay thin and delegate validation, authorization checks, and persistence logic to server-only modules.

## Dataset Processing Flow

Dataset upload logic lives in server-only modules under `src/lib/datasets`. `validation.ts` centralizes file size, extension, and MIME checks. `csv-parser.ts` uses `csv-parse` rather than string splitting. `profiler.ts` infers deterministic column metadata without storing raw rows. `upload.ts` owns the mutation flow from pending dataset creation through private Storage upload, CSV parsing, `dataset_columns` inserts, ready or failed status updates, automatic quality analysis, and activity event recording.

Automatic data-quality detection lives under `src/lib/data-quality`. Detectors are deterministic, independently testable modules. The engine runs them over the parsed rows and profile output, isolates detector failures, and persists compact automated issues through a server-only privileged client.

The current implementation buffers CSV files server-side, capped at 20 MB. That keeps parsing, profiling, and quality detection simple while avoiding browser-side parsing and raw row persistence.

## Supabase Architecture

Supabase provides PostgreSQL, Auth, and future Realtime. The app has three utility entry points:

- `src/lib/supabase/client.ts` creates a browser client for Client Components.
- `src/lib/supabase/server.ts` creates a cookie-aware server client for Server Components, Server Actions, and Route Handlers.
- `src/lib/supabase/admin.ts` creates a server-only service-role client for future privileged backend work.

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe. `SUPABASE_SERVICE_ROLE_KEY` is server-only and guarded by a `server-only` import. Environment guards keep local builds from failing before a Supabase project is configured.

## Authentication Flow

Authentication uses Supabase Auth with cookie-backed SSR sessions. Next.js 16 Proxy lives at `src/proxy.ts` and calls `src/lib/supabase/proxy.ts` to refresh sessions with `getClaims()`, write refreshed cookies, redirect unauthenticated protected-route requests to `/login`, and redirect authenticated users away from `/login` and `/signup`.

Protected pages also call `requireUser()` from `src/lib/auth/session.ts`, so Proxy is not the only authorization layer. Server Actions verify the current user before mutating workspace data.

## Database Architecture

The Phase 2 migration creates `profiles`, `workspaces`, `workspace_members`, `datasets`, `dataset_columns`, `data_quality_issues`, `issue_comments`, and `activity_events`. The Phase 3 migration adds `datasets.processing_error`, creates the private `datasets` Storage bucket, and adds Storage policies tied to dataset rows and workspace membership. The Phase 4 migration adds automated issue source, metadata, keys, issue-type constraints, and direct-client protections for automated issues. RLS is enabled on every application table. Membership checks use narrow `SECURITY DEFINER` helper functions with explicit `search_path = public` to avoid recursive policies on `workspace_members`.

Workspace creation goes through `public.create_workspace(name, description)`, which validates the authenticated user, generates a unique slug, inserts the workspace, and inserts the creator as `owner` in a single transaction.

Dataset files are stored under `workspace_id/dataset_id/original_filename`. Storage policies parse the path, verify the matching dataset row, and reuse workspace membership helpers. Viewers can read and download through signed URLs. Only owner, admin, and member roles can upload or modify dataset objects.

## Planned Realtime Usage

Realtime subscriptions should be added after the database model exists. Expected channels include workspace activity, issue comments, issue status changes, and dataset review updates. Client subscriptions should be scoped to the active workspace and cleaned up when users leave a page or switch workspaces.

## Planned Data Model

The TypeScript domain model mirrors the Phase 2 database concepts:

- Workspaces and workspace members
- Datasets and dataset columns
- Data-quality issues
- Issue comments
- Activity events

The PostgreSQL schema uses UUID primary keys, workspace-scoped foreign keys, timestamp columns, indexes for common dashboard queries, check constraints for roles/statuses/severity, and RLS policies keyed to workspace membership.
