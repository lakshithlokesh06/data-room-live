# DataRoom Live

DataRoom Live is a production-quality portfolio project for a real-time collaborative dataset review workspace. It is designed for data teams that need a shared place to register datasets, inspect metadata, identify quality issues, discuss findings, assign ownership, and resolve review work together.

## Core Planned Features

- Workspace creation and team membership
- Dataset registration and upload workflows
- Dataset metadata and column profiling views
- Data-quality issue tracking with assignment and resolution states
- Issue comments and collaborative review discussion
- Realtime activity feeds for workspace updates
- Supabase Auth-backed access control

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui with Radix-backed primitives
- Next.js Route Handlers
- PostgreSQL via Supabase
- Supabase Auth and Realtime foundations

## Current Project Status

Phase 2 is complete: database foundation and authentication. The app now includes Supabase schema migrations, Row Level Security policies, SSR auth session refresh through Next.js Proxy, login/signup flows, protected dashboard routes, authenticated account display, and atomic workspace creation. Dataset uploads, profiling, issue-management UI, comments UI, and realtime collaboration are intentionally not implemented yet.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` after the dev server starts.

## Environment Variables

`NEXT_PUBLIC_SUPABASE_URL` is browser-safe and should contain the Supabase project URL.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is browser-safe and should contain the public anon key used by client and server SSR clients.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never be imported into client components or exposed to browser bundles.

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and out of browser code.
5. Apply migrations from `supabase/migrations/` using the Supabase CLI or Supabase SQL Editor.

```bash
supabase db push
```

If you are using the Supabase dashboard instead of the CLI, run the SQL in `supabase/migrations/202609030001_database_auth_foundation.sql`.

## Authentication Configuration

Set the site URL and redirect URLs in the Supabase Auth dashboard. For local development, include:

```text
http://localhost:3000
http://localhost:3000/auth/callback
```

For production, add the production origin and `/auth/callback` URL for that origin.

## Folder Structure

```text
src/
  app/
    (auth)/
    (dashboard)/
    auth/
    api/
    layout.tsx
    page.tsx
    globals.css
  components/
    layout/
    shared/
    ui/
  lib/
    auth/
    supabase/
    validation/
    workspaces/
    utils.ts
  types/
supabase/
  migrations/
docs/
public/
```

## Development Roadmap

1. Build workspace detail pages and role-aware member read surfaces.
2. Add dataset registration metadata UI without file uploads.
3. Add dataset upload, Supabase Storage buckets, and CSV parsing.
4. Add dataset profiling and metadata inspection.
5. Implement issue creation, assignment, status transitions, and comments.
6. Add Supabase Realtime subscriptions for activity and collaboration surfaces.
7. Add deeper test coverage, seed data, and deployment documentation.
