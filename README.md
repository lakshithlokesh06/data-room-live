# DataRoom Live

**Real-Time Collaborative Dataset Review Workspace**

DataRoom Live is a modern collaborative data-quality review platform designed for data teams to securely upload datasets, automatically profile their structure, detect potential data-quality problems, and review findings within shared workspaces.

The platform combines secure workspace-based access control, CSV profiling, deterministic data-quality detection, and structured issue tracking to provide a foundation for collaborative dataset review.

> Collaborative data quality review for modern data teams.

---

## Overview

Data quality problems such as missing values, duplicate records, inconsistent formats, suspicious outliers, and malformed columns can significantly affect downstream analytics and machine learning workflows.

DataRoom Live provides a centralized workspace where teams can:

- Create collaborative workspaces
- Securely upload CSV datasets
- Automatically profile dataset structure
- Inspect column-level statistics
- Detect potential data-quality problems
- Review automatically generated quality issues
- Monitor dataset and issue activity
- Securely access datasets based on workspace roles

Data-quality findings are designed as **review signals rather than definitive claims that data is incorrect**.

---

## Core Features

### Authentication & Security

- Email/password authentication using Supabase Auth
- Server-side session handling with Supabase SSR
- Protected application routes
- Automatic user profile creation
- Secure sign-in, sign-up, and sign-out flows
- Row Level Security across application tables
- Server-only privileged Supabase operations
- Role-based workspace authorization

### Collaborative Workspaces

Users can create workspaces for organizing datasets and future collaboration.

Supported workspace roles:

- `owner`
- `admin`
- `member`
- `viewer`

Workspace creation is handled atomically so the creator is automatically registered as the workspace owner.

### Secure Dataset Upload

DataRoom Live currently supports CSV datasets up to **20 MB**.

The upload pipeline includes:

1. File validation
2. Workspace authorization
3. Dataset metadata creation
4. Upload to private Supabase Storage
5. Server-side CSV parsing
6. Dataset profiling
7. Column metadata persistence
8. Automatic data-quality analysis
9. Activity tracking

Raw datasets remain in private Supabase Storage rather than being stored row-by-row in PostgreSQL.

### CSV Profiling

Uploaded CSV files are parsed server-side using `csv-parse`.

The profiler calculates:

- Row count
- Column count
- Column names
- Column positions
- Detected data types
- Missing-value counts
- Unique-value counts
- Nullable status

Supported inferred types include:

- Integer
- Float
- Boolean
- Date
- Datetime
- String

The profiling logic also handles common missing representations and preserves leading-zero values where string semantics are likely.

### Automated Data-Quality Detection

After profiling, DataRoom Live automatically runs deterministic quality detectors.

Currently supported detectors:

- Missing values
- Duplicate rows
- Constant columns
- High-cardinality columns
- Mixed/inconsistent data types
- Possible numeric outliers
- Inconsistent categorical values
- Invalid/inconsistent dates
- Leading/trailing whitespace anomalies
- Unnamed columns

No AI or LLM is used for quality detection. The rules are deterministic and explainable.

### Numeric Outlier Detection

Possible numeric outliers are detected using the **Interquartile Range (IQR)** method:

```text
Lower Bound = Q1 - 1.5 × IQR
Upper Bound = Q3 + 1.5 × IQR
```

Outlier findings are presented as potential review signals and are not automatically treated as invalid data.

### Issue Severity

Quality findings use four severity levels:

- `low`
- `medium`
- `high`
- `critical`

Severity is calculated deterministically based on factors such as affected-value counts and ratios.

### Data Quality Review

Dataset detail pages provide a Data Quality section containing:

- Open issue count
- Severity information
- Issue type
- Affected column
- Issue description
- Issue status
- Severity filters
- Issue-type filters

Individual findings can also be inspected through:

```text
/issues/[issueId]
```

The issue page currently provides a read-only view of the detection result.

### Secure Dataset Downloads

Datasets are stored in a private Supabase Storage bucket.

Authorized workspace members can download original CSV files through temporary signed URLs.

Permanent public dataset URLs are not exposed.

### Dashboard

The authenticated dashboard provides real application metrics including:

- Open issue count
- High/critical issue count
- Datasets containing quality issues
- Workspace and dataset information

No fake analytics data is used.

### Activity Tracking

The platform records important dataset lifecycle events including:

- Dataset upload started
- Dataset processing completed
- Dataset processing failed
- Quality analysis completed
- Quality issues detected

Activity metadata does not contain raw CSV rows or sensitive dataset contents.

---

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui

### Backend

- Next.js App Router
- Next.js Route Handlers
- Server Actions
- Server Components

### Database & Platform

- PostgreSQL
- Supabase
- Supabase Auth
- Supabase Storage
- Supabase Row Level Security
- Supabase SSR

### Data Processing

- Node.js
- `csv-parse`
- Custom deterministic dataset profiler
- Custom data-quality detection engine

### Planned Real-Time Layer

- Supabase Realtime

---

## Architecture

DataRoom Live uses a full-stack Next.js architecture with Supabase providing authentication, PostgreSQL, Storage, and the foundation for future real-time collaboration.

```text
Browser
   │
   ▼
Next.js 16
   │
   ├── Server Components
   ├── Server Actions
   ├── Route Handlers
   │
   ▼
Supabase
   │
   ├── Auth
   ├── PostgreSQL
   ├── Row Level Security
   ├── Private Storage
   └── Realtime (planned)
```

Dataset processing follows:

```text
CSV Upload
    │
    ▼
Validation
    │
    ▼
Private Supabase Storage
    │
    ▼
Server-side CSV Parsing
    │
    ▼
Dataset Profiling
    │
    ▼
Column Metadata
    │
    ▼
Data Quality Engine
    │
    ▼
Automated Quality Issues
    │
    ▼
Review Interface
```

---

## Database Model

The current database includes:

### `profiles`

Stores application profile information linked to Supabase Auth users.

### `workspaces`

Represents collaborative dataset-review environments.

### `workspace_members`

Associates users with workspaces and their authorization roles.

### `datasets`

Stores dataset metadata and processing state.

Dataset statuses include:

- `pending`
- `processing`
- `ready`
- `failed`

### `dataset_columns`

Stores column-level profiling metadata.

### `data_quality_issues`

Stores manual and automatically generated quality findings.

Automated findings include structured detection metadata and deterministic issue keys to support idempotent processing.

### `issue_comments`

Schema foundation for future collaborative issue discussions.

### `activity_events`

Stores workspace and dataset lifecycle events.

---

## Row Level Security

Row Level Security is enabled across application tables.

Authorization is primarily derived from workspace membership.

General access model:

| Role | Read | Upload Dataset | Modify Data |
|---|---|---|---|
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes |
| Member | Yes | Yes | Yes |
| Viewer | Yes | No | No |

Server-side authorization is also performed before sensitive mutations.

Automated issues cannot be forged directly by ordinary clients.

---

## Project Structure

```text
DataRoom Live/
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── dataset-processing.md
│   └── data-quality.md
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── auth/
│   │   ├── layout/
│   │   ├── shared/
│   │   ├── ui/
│   │   └── workspaces/
│   │
│   ├── lib/
│   │   ├── auth/
│   │   ├── data-quality/
│   │   ├── datasets/
│   │   ├── supabase/
│   │   └── utils/
│   │
│   ├── types/
│   └── proxy.ts
│
├── supabase/
│   └── migrations/
│
├── .env.example
├── package.json
└── README.md
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone git@github.com:lakshithlokesh06/data-room-live.git
cd data-room-live
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create:

```text
.env.local
```

using `.env.example` as the template.

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intended for browser-compatible Supabase access.

`SUPABASE_SERVICE_ROLE_KEY` is **server-only** and must never be exposed to Client Components or committed to Git.

### 4. Configure Supabase

Create or connect a Supabase project and apply the migrations from:

```text
supabase/migrations/
```

Apply them in filename order.

The migrations configure:

- Core application tables
- Foreign keys and constraints
- Row Level Security
- Workspace authorization
- Profile creation
- Atomic workspace creation
- Private dataset Storage policies
- Automated data-quality issue support

### 5. Configure Authentication

Configure the Supabase Auth Site URL and allowed redirect URLs.

For local development:

```text
http://localhost:3000
http://localhost:3000/auth/callback
```

Add equivalent production URLs when deploying.

### 6. Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Quality Checks

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

At the completion of the automated data-quality phase, the project validation suite contains:

```text
16 test files
45 passing tests
```

Tests cover areas including:

- Authentication validation
- Workspace validation
- CSV validation
- CSV parsing
- Missing-value handling
- Type inference
- Dataset profiling
- Data-quality detectors
- Severity logic
- Detector orchestration

---

## Current Development Status

Completed:

- [x] Project foundation
- [x] Responsive SaaS interface
- [x] Supabase integration foundation
- [x] Authentication
- [x] Protected application routes
- [x] PostgreSQL schema
- [x] Row Level Security
- [x] Workspace creation and membership
- [x] Private dataset Storage
- [x] CSV upload
- [x] Dataset profiling
- [x] Column metadata
- [x] Secure dataset downloads
- [x] Automated data-quality detection
- [x] Structured quality issues
- [x] Issue severity classification
- [x] Dataset quality overview
- [x] Read-only issue details
- [x] Real dashboard issue metrics
- [x] Activity tracking

Planned:

- [ ] Manual issue creation
- [ ] Issue assignment
- [ ] Issue status workflow
- [ ] Issue comments
- [ ] Supabase Realtime subscriptions
- [ ] Live collaboration
- [ ] Presence indicators
- [ ] Workspace invitations
- [ ] Member management
- [ ] Notifications
- [ ] Dataset row preview
- [ ] Advanced quality analytics

---

## Data Quality Philosophy

Automated findings in DataRoom Live are intended to identify **potential data-quality concerns for human review**.

For example, a statistical outlier may represent a legitimate observation rather than an error. Similarly, high cardinality or missing data may be completely valid depending on the dataset and its intended use.

For this reason, DataRoom Live treats automated detection as a review workflow rather than automatic factual validation or automatic data modification.

---

## Roadmap

### Phase 1 — Foundation
Next.js application architecture, responsive UI, Supabase clients, domain types, and documentation.

### Phase 2 — Database & Authentication
PostgreSQL schema, RLS, Supabase Auth, profiles, workspace membership, and protected routes.

### Phase 3 — Dataset Processing
Private Storage, secure CSV uploads, parsing, profiling, metadata extraction, downloads, and activity tracking.

### Phase 4 — Data Quality
Deterministic quality detectors, automated issues, severity classification, dataset quality views, and issue inspection.

### Phase 5 — Collaborative Issue Workflow
Manual issues, assignments, status transitions, resolution/dismissal, and comments.

### Phase 6 — Real-Time Collaboration
Supabase Realtime subscriptions, live issue/comment updates, presence, and collaboration indicators.

### Future
Workspace invitations, notifications, dataset preview, richer analytics, and production-readiness improvements.

---

## Security

DataRoom Live follows several security principles:

- Private dataset Storage
- Row Level Security
- Server-side authorization
- Workspace-scoped access
- Role-based permissions
- Temporary signed dataset URLs
- Server-only service-role credentials
- No raw CSV rows stored in issue metadata
- No client-controlled user identity for privileged mutations
- Automated issue creation protected from client forgery

Never commit `.env.local` or real Supabase credentials.

---

## License

This project is intended as a portfolio and educational software project.
