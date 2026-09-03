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

Phase 1 is complete: project foundation and architecture only. The app contains a polished static landing page, dashboard shell, placeholder navigation routes, foundational domain types, Supabase client utilities, environment examples, and architecture documentation. Authentication, database schema, uploads, issue workflows, and realtime subscriptions are intentionally not implemented yet.

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

## Folder Structure

```text
src/
  app/
    (dashboard)/
    api/
    layout.tsx
    page.tsx
    globals.css
  components/
    layout/
    shared/
    ui/
  lib/
    supabase/
    utils.ts
  types/
supabase/
  migrations/
docs/
public/
```

## Development Roadmap

1. Add Supabase schema migrations for workspaces, members, datasets, columns, issues, comments, and activity events.
2. Implement Supabase Auth, protected routes, and session refresh middleware.
3. Build workspace and dataset CRUD workflows.
4. Add dataset upload/registration and metadata inspection.
5. Implement issue creation, assignment, status transitions, and comments.
6. Add Supabase Realtime subscriptions for activity and collaboration surfaces.
7. Harden authorization rules with Supabase Row Level Security policies.
8. Add test coverage, seeded demos, and deployment documentation.
