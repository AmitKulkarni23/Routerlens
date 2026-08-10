# Task 02 — Supabase Schema, Migrations, RLS, and Aggregate Views

## Summary

Create the Postgres schema for Routerlens in `supabase/migrations/` as
sequential SQL migration files: the four core tables (`runs`, `calls`,
`item_status`, `incidents`), row-level security policies restricting the
anon role to read-only access on aggregate views (never fact tables), and
the `daily_provider_stats` view the dashboard and incident detector both
read from. This is the single source of truth for storage shape — the
`store` crate (Task 07) and frontend Supabase client (Task 12) are both
written against the schema this task produces.

## Read First

- `docs/system-specs/architecture.md` §7 (Data model) — exact table/column
  definitions to implement verbatim.
- `docs/system-specs/architecture.md` §8 (Incident detection) — defines the
  rolling-mean/threshold logic the `daily_provider_stats` view must supply
  data for (pass rate, error rate, p50/p95 latency, cost per correct answer,
  grouped by provider by day).
- `docs/system-specs/architecture.md` §10 (Security & secrets) — RLS
  requirement: anon role gets `SELECT` on views only; fact tables are
  service-role only.
- `README.md` "Secrets policy" — confirms anon key is public by design,
  service-role key is CI/local only.

## Requirements

### Core tables

- Migration files MUST create exactly these tables, matching
  architecture.md §7 column-for-column:
  - `runs (id uuid pk default gen_random_uuid(), started_at timestamptz not null, finished_at timestamptz, bank_version int not null, git_sha text, status text not null check (status in ('completed','partial','failed')))`
  - `calls (id uuid pk default gen_random_uuid(), run_id uuid not null references runs(id), item_id text not null, category text not null, provider text not null, repeat_idx int not null, call_ok boolean not null, pass boolean, raw_response text, finish_reason text, latency_ms int, cost_usd numeric, error_kind text, created_at timestamptz not null default now())`
  - `item_status (item_id text primary key, status text not null check (status in ('active','retired_too_hard','retired_ceiling','anchor')), reason text, updated_at timestamptz not null default now())`
  - `incidents (id uuid pk default gen_random_uuid(), provider text not null, detected_at timestamptz not null default now(), metric text not null, baseline numeric not null, observed numeric not null, delta numeric not null, resolved_at timestamptz)`
- `calls.error_kind` MUST accept only the taxonomy values used by the
  `openrouter` crate (Task 05): `timeout`, `http_4xx`, `http_5xx`,
  `rate_limited`, `malformed_response`, or `NULL` — enforce via a `check`
  constraint or leave unconstrained with a comment noting the crate is the
  source of truth (implementer's choice, document which was chosen).
- Indexes MUST exist on `calls(run_id)`, `calls(provider, created_at)`, and
  `incidents(provider, resolved_at)` to support the aggregate view and
  incident-resolution lookups.

### RLS policies

- RLS MUST be enabled on all four fact tables (`runs`, `calls`,
  `item_status`, `incidents`).
- No `SELECT`/`INSERT`/`UPDATE`/`DELETE` policy MUST exist for the `anon`
  role on any fact table — anon has zero access to fact tables.
- The `daily_provider_stats` view (below) MUST have RLS enabled with a
  `SELECT`-only policy granted to `anon`.
- Writes (insert/update on fact tables) happen only via the service-role
  connection string (`DATABASE_URL`) used by the prober — no explicit
  service-role policy is needed since service-role bypasses RLS by default;
  document this assumption in a migration comment.

### Aggregate view

- `daily_provider_stats` MUST be a view (or materialized view refreshed
  by the same migration transaction pattern — implementer's choice,
  plain view preferred for simplicity) grouped by `provider` and
  `date_trunc('day', created_at)` exposing at minimum: `provider`, `day`,
  `pass_rate` (percentage of graded calls where `pass = true`),
  `error_rate` (percentage of calls where `call_ok = false`),
  `p50_latency_ms`, `p95_latency_ms`, `cost_per_correct_usd` (sum of
  `cost_usd` for the day divided by count of passing calls, null-safe when
  zero passes), and `call_count`.
- The view MUST only include calls for items whose `item_status.status` is
  `active` or `anchor` (exclude `retired_too_hard` and `retired_ceiling`)
  when computing `pass_rate` and `cost_per_correct_usd` — join against
  `item_status`, treating an item with no `item_status` row as `active`
  (LEFT JOIN with `coalesce(status, 'active')`).

## TDD Plan

N/A — SQL migration/RLS task, not unit tested. Project testing policy
(architecture.md §11) restricts unit tests to grading, fan-out, calibration
filtering, and incident detection; database schema is out of scope for
automated tests. Verify by applying migrations to a local or scratch
Supabase project via `supabase db push` (or the SQL editor) and confirming
no errors, then manually querying `daily_provider_stats` against seeded
rows to sanity-check the aggregation.

## Dependencies

Task 01 (repo scaffolding — `supabase/migrations/` directory must exist).

## Files to Create/Modify

- `supabase/migrations/0001_core_tables.sql` (create — runs, calls, item_status, incidents)
- `supabase/migrations/0002_rls_policies.sql` (create — enable RLS, anon policies)
- `supabase/migrations/0003_daily_provider_stats_view.sql` (create — the aggregate view)

## Acceptance Criteria

- All RED tests written and failing for the right reason: N/A, no tests in this task.
- All tests GREEN with minimal implementation: N/A.
- REFACTOR pass complete, no regressions: N/A.
- Migrations apply cleanly in order against a fresh Postgres/Supabase database.
- `anon` role can `SELECT` from `daily_provider_stats` and cannot `SELECT`
  from `runs`, `calls`, `item_status`, or `incidents` (verified manually
  with `set role anon;` in the SQL editor or via `supabase db` RLS test).
- `daily_provider_stats` correctly excludes `retired_too_hard` and
  `retired_ceiling` items from `pass_rate` when manually seeded with a
  mixed-status test row set.

## Spec Updates

None — schema matches `docs/system-specs/architecture.md` §7 exactly; no
spec content changes required. If the implementer deviates from the
column/table shapes above for a technical reason, they MUST update
architecture.md §7 to match and note the deviation in the PR description.
