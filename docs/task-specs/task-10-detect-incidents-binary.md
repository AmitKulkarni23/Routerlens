# Task 10 — Detect-Incidents Binary

## Summary

Implement the `detect_incidents` binary: for each probed provider, compares
today's pass rate against its 7-day rolling mean (excluding today) and
opens an incident row when the drop is ≥10 percentage points with
sufficient history; resolves an open incident when the pass rate returns
within 3 points of baseline. The threshold comparison logic is pure and
unit-tested per project testing policy; the binary itself is a thin runner
over `store` plus this logic.

## Read First

- `docs/system-specs/architecture.md` §8 (Incident detection) — the exact
  rule: "compare today's pass rate against the 7-day rolling mean
  (excluding today). If drop ≥ 10 percentage points and ≥ 7 days of history
  exist, insert an incident row. An open incident resolves when pass rate
  returns within 3 points of baseline." Two threshold constants only, no
  tuning knobs.
- `docs/system-specs/architecture.md` §7 (Data model) — `incidents` table
  shape: `provider, detected_at, metric, baseline, observed, delta, resolved_at`.
- `docs/system-specs/architecture.md` §11 — incident detection thresholds
  are explicitly in scope for unit tests.

## Requirements

### Pure threshold logic (unit-testable, no I/O)

- MUST expose `pub const DROP_THRESHOLD_POINTS: f64 = 10.0;`,
  `pub const RESOLVE_THRESHOLD_POINTS: f64 = 3.0;`, and
  `pub const MIN_HISTORY_DAYS: usize = 7;` as named constants (not inlined
  magic numbers) so tests can reference and, if needed, override them.
- MUST expose `pub fn evaluate_incident(history: &[f64], today: f64) -> IncidentDecision`
  where `history` is the trailing daily pass rates excluding today (most
  recent last, or documented order — implementer's choice, but consistent
  and documented), and `IncidentDecision` is an enum:
  `{ InsufficientHistory, NoIncident, Open { baseline: f64, delta: f64 }, ResolvesOpen }`.
- `evaluate_incident` MUST return `InsufficientHistory` if `history.len() < MIN_HISTORY_DAYS`.
- `evaluate_incident` MUST compute `baseline` as the arithmetic mean of
  `history`, and MUST return `Open { baseline, delta }` (where
  `delta = baseline - today`) if `baseline - today >= DROP_THRESHOLD_POINTS`.
- `evaluate_incident` MUST return `ResolvesOpen` if `baseline - today <= RESOLVE_THRESHOLD_POINTS`
  (i.e. the gap has closed to within the resolve threshold) — this signal
  is advisory; whether an incident is actually open for that provider is
  determined by the caller querying `store`, not by this pure function.
- `evaluate_incident` MUST return `NoIncident` for any case not matching
  the above (sufficient history, drop below open threshold, gap above
  resolve threshold).

### Binary wiring

- MUST iterate over the four probed providers (Groq, DeepInfra, Novita,
  Together), for each calling `store.get_daily_pass_rates(provider, 8)`
  (7 days of history plus today), splitting the result into `history` and
  `today`.
- MUST call `evaluate_incident`; on `Open { baseline, delta }`, MUST call
  `store.insert_incident(provider, "pass_rate", baseline, today, delta)`
  UNLESS `store.get_open_incident(provider)` already returns a value (no
  duplicate open incidents for the same provider).
- MUST call `store.resolve_incident` when `evaluate_incident` returns
  `ResolvesOpen` AND `store.get_open_incident(provider)` returns
  `Some(incident_id)`.
- MUST log (structured, via `tracing`) one line per provider stating the
  decision reached, without logging `DATABASE_URL`.

## TDD Plan

### RED

- `evaluate_incident_given_insufficient_history_should_return_insufficient_history` — `history.len() == 5` (< 7) → `InsufficientHistory`.
- `evaluate_incident_given_ten_point_drop_should_open_incident` — history mean 80.0, today 70.0 (exactly 10-point drop) → `Open { baseline: 80.0, delta: 10.0 }`.
- `evaluate_incident_given_drop_below_threshold_should_return_no_incident` — history mean 80.0, today 75.0 (5-point drop) → `NoIncident`.
- `evaluate_incident_given_gap_within_resolve_threshold_should_resolve` — history mean 80.0, today 78.0 (2-point gap) → `ResolvesOpen`.

### GREEN

1. In `prober/bin/detect_incidents/src/main.rs` (or a `lib.rs`/`logic.rs`
   module for testability), define the three constants and
   `IncidentDecision` enum.
2. Implement `evaluate_incident`.
3. Run the four RED tests, confirm all pass.
4. Wire the binary: iterate providers, call `store`, call
   `evaluate_incident`, act on the result as specified above.

### REFACTOR

Extract `evaluate_incident` into `prober/bin/detect_incidents/src/logic.rs`
if not already separated from `main.rs`, so it stays testable independent
of CLI/database setup. No behavior change.

## Dependencies

Task 02 (Supabase schema — `daily_provider_stats` view, `incidents` table), Task 07 (store crate).

## Files to Create/Modify

- `prober/bin/detect_incidents/src/main.rs` (modify — CLI/provider-loop wiring)
- `prober/bin/detect_incidents/src/logic.rs` (create — constants, `IncidentDecision`, `evaluate_incident`, and the four unit tests)
- `prober/bin/detect_incidents/Cargo.toml` (modify — add `store` path dependency, `tracing`, `tokio` via workspace)

## Acceptance Criteria

- All RED tests written and failing for the right reason (unimplemented `evaluate_incident`).
- All tests GREEN with minimal implementation.
- REFACTOR pass complete, no regressions.
- Exactly-at-threshold boundary (10.0-point drop) opens an incident; a
  9.9-point drop does not (verified by the RED tests above using precise
  boundary values).
- Duplicate-open-incident prevention verified manually against a scratch
  DB: running the binary twice in a row with the same drop condition
  produces only one open `incidents` row for that provider.
- `cargo test -p detect_incidents` passes with zero warnings.

## Spec Updates

None.
