# Task 12 — Frontend Dashboard

## Summary

Build the v1 dashboard pages against the Vite/React/MUI scaffold: a
per-provider overview page with pass-rate time-series chart and summary
cards, an incidents feed, a category breakdown table, and a methodology
page. The frontend reads Supabase directly with the public anon key,
querying only the `daily_provider_stats` view and the `incidents` table's
read-exposed view (RLS-restricted per Task 02) — no backend API layer.
Presentation MUST remain neutral: no ranking, scoring, or "winner" language
anywhere in the UI.

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
- `docs/system-specs/architecture.md` §10 — anon key is public by design,
  constrained by RLS to views only; the Supabase client MUST use the anon
  key, never a service-role key, in frontend code.
- `README.md` "Why the code is public" and top-level project summary — the
  neutrality framing ("no ranking, no winner-picking") that MUST be
  reflected in copy and layout decisions (no color-coded "best/worst"
  rankings, no medal icons, no sorting that implies a winner by default).

## Requirements

### Data access layer

- MUST create a single Supabase client instance
  (`@supabase/supabase-js`, initialized with `import.meta.env.VITE_SUPABASE_URL`
  and `import.meta.env.VITE_SUPABASE_ANON_KEY`) in one module, imported by
  all pages — no page MUST construct its own client.
- MUST query only `daily_provider_stats` and the incidents read view — MUST
  NOT query `runs`, `calls`, or `item_status` directly (these are
  service-role-only per RLS; attempting to read them from the frontend
  MUST NOT be present anywhere in the code, even as dead code).
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
§11: "No frontend unit tests"). Verify manually via `bun run dev` and
visual inspection against a scratch Supabase project seeded with sample
`daily_provider_stats` and incidents rows.

## Dependencies

Task 01 (repo scaffolding — frontend Vite/MUI scaffold), Task 02 (Supabase schema — `daily_provider_stats` view; this task may extend it with additional views per the requirements above).

## Files to Create/Modify

- `frontend/src/lib/supabaseClient.ts` (create)
- `frontend/src/pages/ProviderOverview.tsx` (create)
- `frontend/src/pages/PassRateChart.tsx` or equivalent chart component (create)
- `frontend/src/pages/IncidentsFeed.tsx` (create)
- `frontend/src/pages/CategoryBreakdown.tsx` (create)
- `frontend/src/pages/Methodology.tsx` (create)
- `frontend/src/App.tsx` (modify — routing between the above pages)
- `frontend/.env.example` (create — `VITE_SUPABASE_URL=`, `VITE_SUPABASE_ANON_KEY=` placeholders)
- `supabase/migrations/000X_public_incidents_and_category_views.sql` (create, only if Task 02's schema does not already expose category-level and incident data to anon — document which views were added)

## Acceptance Criteria

- All RED tests written and failing for the right reason: N/A, no frontend unit tests per policy.
- All tests GREEN with minimal implementation: N/A.
- REFACTOR pass complete, no regressions: N/A.
- `bun run dev` renders all four pages without console errors against a
  seeded scratch Supabase project.
- No component queries `runs`, `calls`, or `item_status` directly (verified
  by grepping `frontend/src` for those table names outside of comments).
- No page contains ranking/winner language (verified by manual copy review
  against the methodology framing in `README.md`).
- `bun run build` succeeds.

## Spec Updates

- `docs/system-specs/architecture.md` §7 MUST be updated to document any
  additional Supabase view(s) this task introduces (e.g.
  `incidents_public`, `daily_provider_category_stats`) beyond
  `daily_provider_stats`, including their column shape.
