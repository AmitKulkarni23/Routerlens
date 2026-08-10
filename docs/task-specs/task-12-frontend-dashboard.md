# Task 12 — Frontend Dashboard

## Summary

Build the v1 dashboard pages against the Vite/React/MUI scaffold: a
per-provider overview page with pass-rate time-series chart and summary
cards, an incidents feed, a category breakdown table, and a methodology
page, plus a thin read API of Vercel serverless functions under
`frontend/api/` (mirroring the RedditScraper project's pattern:
server-side routes query Supabase; the browser only ever fetches JSON from
`/api/*`). The functions use the anon key server-side and query only the
`daily_provider_stats` view and the incidents read view (RLS-restricted
per Task 02). No Supabase client, URL, or key may appear in browser-side
code or the built bundle. Presentation MUST remain neutral: no ranking,
scoring, or "winner" language anywhere in the UI.

## Read First

- `docs/system-specs/architecture.md` §9 (Dashboard v1 scope) — the exact
  page/component list this task implements: per-provider overview cards
  (current pass rate, 7-day trend, error rate, median latency, cost per
  correct answer), pass-rate time-series chart (the hero visual), incidents
  feed, category breakdown table, methodology page, no ranking/no winner.
- `docs/system-specs/architecture.md` §7 — `daily_provider_stats` view
  columns this task's queries select from: `provider, day, pass_rate,
  error_rate, p50_latency_ms, p95_latency_ms, cost_per_correct_usd,
  call_count`; `incidents` row shape: `provider, detected_at, metric,
  baseline, observed, delta, resolved_at`.
- `docs/system-specs/architecture.md` §9 (Read API table) and §10 — the
  four endpoints (`/api/providers`, `/api/timeseries`, `/api/incidents`,
  `/api/categories`), and the rule that `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` are server-side env vars (no `VITE_` prefix ever);
  the anon key never reaches the browser; the service-role key never
  appears anywhere in frontend or API code.
- `README.md` "Why the code is public" and top-level project summary — the
  neutrality framing ("no ranking, no winner-picking") that MUST be
  reflected in copy and layout decisions (no color-coded "best/worst"
  rankings, no medal icons, no sorting that implies a winner by default).

## Requirements

### Read API (Vercel serverless functions)

- MUST implement four TypeScript serverless functions under `frontend/api/`
  (Vercel convention): `providers.ts`, `timeseries.ts`, `incidents.ts`,
  `categories.ts`, each responding to GET with JSON per architecture.md §9.
- MUST create a single Supabase client helper module (e.g.
  `frontend/api/_lib/supabase.ts`, following RedditScraper's
  `packages/web/lib/supabase.ts` shape: `createClient` from
  `@supabase/supabase-js` using `process.env.SUPABASE_URL` and
  `process.env.SUPABASE_ANON_KEY`, throwing if either is missing) —
  imported by all four functions; no function constructs its own client.
- Env vars MUST NOT use the `VITE_` prefix — that prefix inlines values
  into the browser bundle, which this architecture forbids.
- Functions MUST query only `daily_provider_stats` and the incidents/category
  read views — MUST NOT query `runs`, `calls`, or `item_status` (service-role-only
  per RLS; those table names must not appear anywhere in `frontend/`, even
  as dead code).
- Browser-side code MUST fetch exclusively from `/api/*` — `@supabase/supabase-js`
  MUST NOT be imported anywhere under `frontend/src/`.
- Incidents MUST be exposed to the frontend through a dedicated read-only
  view (e.g. `incidents_public`) rather than the raw `incidents` table if
  the Task 02 schema did not already expose incidents through
  `daily_provider_stats` — if this view does not yet exist, the
  implementer MUST add a migration for it under `supabase/migrations/`
  as part of this task (documented in Spec Updates below) rather than
  querying the restricted table.

### Pages and components

- MUST implement a provider overview page rendering one MUI `Card` per
  probed provider (Groq, DeepInfra, Novita, Together) showing: current
  (most recent day's) pass rate, 7-day trend (simple delta or sparkline),
  error rate, median (p50) latency, and cost per correct answer — sourced
  from the most recent rows of `daily_provider_stats`.
- MUST implement a pass-rate time-series chart (any charting library
  compatible with React — implementer's choice, e.g. `recharts` or
  `@mui/x-charts`) plotting `pass_rate` over `day` as one line/series per
  provider, all providers visible simultaneously with equal visual
  weight (no default sort or highlight implying ranking).
- MUST implement an incidents feed listing open and recently resolved
  incidents in reverse-chronological order by `detected_at`, rendering a
  plain-language sentence per incident (e.g. "Groq dropped 11 points on
  2026-08-08"), constructed from `provider`, `delta`, and `detected_at`.
- MUST implement a category breakdown table per provider (rows = category,
  columns = providers or vice versa) showing pass rate by category — if
  `daily_provider_stats` does not carry category granularity, the
  implementer MUST add a second view (e.g. `daily_provider_category_stats`)
  via a migration under `supabase/migrations/`, documented in Spec Updates.
- MUST implement a methodology page (static content, no data fetching)
  explaining: what is measured (pinned-provider calls), how grading works
  (the four mechanical grade types, no LLM judge), and the calibration
  rules (reference run, ceiling retirement) — content sourced from
  architecture.md §5–§6, written in plain language for a public audience.
- MUST NOT include any UI element that ranks, scores, sorts-by-default-to-imply-a-winner,
  or labels a provider "best"/"worst"/"winner" anywhere in these four pages.

## TDD Plan

N/A — no frontend unit tests per project testing policy (architecture.md
§11: "No frontend unit tests", explicitly including the serverless
functions). Verify manually via `vercel dev` (runs SPA + API functions
together) and visual inspection against a scratch Supabase project seeded
with sample `daily_provider_stats` and incidents rows.

## Dependencies

Task 01 (repo scaffolding — frontend Vite/MUI scaffold), Task 02 (Supabase schema — `daily_provider_stats` view; this task may extend it with additional views per the requirements above).

## Files to Create/Modify

- `frontend/api/_lib/supabase.ts` (create — shared server-side Supabase client helper)
- `frontend/api/providers.ts`, `frontend/api/timeseries.ts`, `frontend/api/incidents.ts`, `frontend/api/categories.ts` (create — serverless functions)
- `frontend/src/lib/apiClient.ts` (create — typed fetch wrappers for the four `/api/*` endpoints)
- `frontend/src/pages/ProviderOverview.tsx` (create)
- `frontend/src/pages/PassRateChart.tsx` or equivalent chart component (create)
- `frontend/src/pages/IncidentsFeed.tsx` (create)
- `frontend/src/pages/CategoryBreakdown.tsx` (create)
- `frontend/src/pages/Methodology.tsx` (create)
- `frontend/src/App.tsx` (modify — routing between the above pages)
- `frontend/.env.example` (create — `SUPABASE_URL=`, `SUPABASE_ANON_KEY=` placeholders; no `VITE_` prefix)
- `supabase/migrations/000X_public_incidents_and_category_views.sql` (create, only if Task 02's schema does not already expose category-level and incident data to anon — document which views were added)

## Acceptance Criteria

- All RED tests written and failing for the right reason: N/A, no frontend unit tests per policy.
- All tests GREEN with minimal implementation: N/A.
- REFACTOR pass complete, no regressions: N/A.
- `vercel dev` renders all four pages without console errors against a
  seeded scratch Supabase project, with data flowing through `/api/*`.
- No code under `frontend/` references `runs`, `calls`, or `item_status`
  (verified by grep), and `@supabase/supabase-js` is not imported anywhere
  under `frontend/src/` (browser code) — only under `frontend/api/`.
- The production bundle (`dist/`) contains no occurrence of `supabase.co`
  or the anon key (verified by grepping build output).
- No page contains ranking/winner language (verified by manual copy review
  against the methodology framing in `README.md`).
- `bun run build` succeeds.

## Spec Updates

- `docs/system-specs/architecture.md` §7 MUST be updated to document any
  additional Supabase view(s) this task introduces (e.g.
  `incidents_public`, `daily_provider_category_stats`) beyond
  `daily_provider_stats`, including their column shape.
