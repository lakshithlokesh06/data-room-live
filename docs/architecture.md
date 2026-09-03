# DataRoom Live Architecture

## Frontend Architecture

DataRoom Live uses Next.js 16 with the App Router and a `src/` application structure. Pages are Server Components by default, with client boundaries reserved for interactive UI such as navigation menus and account controls. The root layout owns global metadata, the sticky navigation shell, Tailwind/shadcn theme tokens, and the shared tooltip provider.

The initial route structure is intentionally small:

- `/` presents the product landing page and feature preview.
- `/dashboard` presents the Phase 1 dashboard shell.
- `/workspaces`, `/datasets`, and `/activity` are static placeholder routes used by the navigation shell.

Reusable UI is split into `src/components/ui` for shadcn primitives, `src/components/layout` for app chrome, and `src/components/shared` for reusable product-specific building blocks.

## API Architecture

API work will use Next.js Route Handlers under `src/app/api`. Phase 1 includes a minimal `/api/health` route to verify the route-handler surface without adding business logic. Future API routes should stay thin and delegate validation, authorization checks, and persistence logic to server-only modules.

## Supabase Architecture

Supabase will provide PostgreSQL, Auth, and Realtime. Phase 1 adds three utility entry points:

- `src/lib/supabase/client.ts` creates a browser client for Client Components.
- `src/lib/supabase/server.ts` creates a cookie-aware server client for Server Components, Server Actions, and Route Handlers.
- `src/lib/supabase/admin.ts` creates a server-only service-role client for future privileged backend work.

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe. `SUPABASE_SERVICE_ROLE_KEY` is server-only and guarded by a `server-only` import.

## Planned Authentication Flow

Authentication will use Supabase Auth with cookie-backed SSR sessions. The next phase should add login/sign-up routes in an auth route group, session refresh middleware, protected dashboard routes, and role-aware authorization checks. Workspace permissions should be enforced both in application code and Supabase Row Level Security policies.

## Planned Realtime Usage

Realtime subscriptions should be added after the database model exists. Expected channels include workspace activity, issue comments, issue status changes, and dataset review updates. Client subscriptions should be scoped to the active workspace and cleaned up when users leave a page or switch workspaces.

## Planned Data Model

The initial TypeScript domain model covers:

- Workspaces and workspace members
- Datasets and dataset columns
- Data-quality issues
- Issue comments
- Activity events

The future PostgreSQL schema should mirror these concepts with UUID primary keys, workspace-scoped foreign keys, timestamp columns, indexes for common dashboard queries, and RLS policies keyed to workspace membership.
