# Task 09 — Calibrate Binary

## Summary

Implement the `calibrate` binary with two modes: `--mode=reference` runs
the full question bank 5× against the calibration reference provider
(CoreWeave) and writes `item_status = retired_too_hard` for any item the
reference passes fewer than 4 of 5 times; `--ceiling-check` computes, over
a trailing window, which active items every probed provider has passed
100% of the time, prints a human-readable report of candidates, and only
writes `item_status` changes (`retired_ceiling` or `anchor`) when invoked
with `--apply`. The filtering rules themselves are pure functions and are
explicitly in scope for unit tests per project testing policy.

## Read First

- `docs/system-specs/architecture.md` §6 (Calibration) — the exact rules:
  run bank 5× against reference, drop items passing <4/5; after 1 week
  live, flag items every probed provider passes 100%, retire most, keep a
  few as anchors; item status lives in `item_status` with values
  `active | retired_too_hard | retired_ceiling | anchor`; aggregate score
  = % of `active + anchor` items passed.
- `docs/system-specs/architecture.md` §3 — reference provider is CoreWeave
  (fp16); probed providers are Groq, DeepInfra, Novita, Together (the
  ceiling check considers only these four, not the reference).
- `docs/system-specs/architecture.md` §11 — calibration filtering is
  explicitly in scope for unit tests.

## Requirements

### Pure filtering functions (unit-testable, no I/O)

- MUST expose `pub fn items_to_retire_too_hard(results: &HashMap<String, u32>, threshold: u32) -> Vec<String>`
  where `results` maps `item_id` to the count of passes out of 5 reference
  runs, and the function returns the `item_id`s with `pass_count < threshold`
  (threshold defaults to 4 per architecture.md §6, but MUST be an explicit
  parameter, not hardcoded, so it is independently testable).
- MUST expose `pub fn items_to_flag_ceiling(pass_rates_by_provider: &HashMap<String, HashMap<String, f64>>) -> Vec<String>`
  where the outer map is keyed by `item_id`, the inner map by `provider`,
  values are pass rate `0.0..=1.0` over the trailing window; an item is
  flagged only if **every** probed provider's pass rate for that item is
  exactly `1.0`. An item with data from fewer providers than expected
  (missing provider key) MUST NOT be flagged (treated as insufficient
  data, not a match).

### Reference mode (`--mode=reference`)

- MUST run the full bank 5 times against the `coreweave` provider using
  the same `fanout`/`openrouter`/`grading`/`store` pipeline components as
  `probe` (reuse, do not reimplement request/grading logic).
- MUST aggregate per-item pass counts across the 5 runs and call
  `items_to_retire_too_hard`, then write `item_status = retired_too_hard`
  via `store.upsert_item_status` for every flagged item — this mode writes
  automatically, no `--apply` gate (architecture.md §6 treats pre-launch
  calibration as automatic).
- MUST print a summary table (item_id, pass_count, retained/retired) to
  stdout.

### Ceiling-check mode (`--ceiling-check`)

- MUST read recent `calls`/aggregate data (via a `store` method reading
  `daily_provider_stats` or an equivalent per-item, per-provider pass-rate
  query — extend `store` if the needed query does not exist yet) for
  `active` items only, over a trailing window (default 7 days, matching
  "after one week live" in architecture.md §6, overridable via
  `--window-days`).
- MUST call `items_to_flag_ceiling` and print a human-readable report
  (item_id, category, per-provider pass rate) listing candidates —
  MUST NOT write anything to `item_status` unless `--apply` is also passed.
- When `--apply` is passed alongside `--ceiling-check`, MUST write
  `item_status = retired_ceiling` for flagged items, EXCEPT items in an
  `--anchors <comma-separated-item-ids>` allowlist (or equivalent explicit
  mechanism) which MUST instead be written as `item_status = anchor` — the
  human operator selects which flagged items become anchors versus
  retirees; the binary MUST NOT decide this automatically.

## TDD Plan

### RED

- `items_to_retire_too_hard_given_pass_count_below_threshold_should_be_flagged` — item with 3/5 passes, threshold 4 → included in result.
- `items_to_retire_too_hard_given_pass_count_at_threshold_should_not_be_flagged` — item with 4/5 passes, threshold 4 → not included in result.
- `items_to_flag_ceiling_given_all_providers_at_100_percent_should_be_flagged` — item with `{groq: 1.0, deepinfra: 1.0, novita: 1.0, together: 1.0}` → included in result.
- `items_to_flag_ceiling_given_one_provider_below_100_percent_should_not_be_flagged` — item with `{groq: 1.0, deepinfra: 0.95, novita: 1.0, together: 1.0}` → not included in result.
- `items_to_flag_ceiling_given_missing_provider_data_should_not_be_flagged` — item with only `{groq: 1.0, deepinfra: 1.0}` (novita/together absent) → not included in result.

### GREEN

1. In `prober/bin/calibrate/src/main.rs` (or a `lib.rs` if the implementer
   splits the binary into a testable library module — recommended so pure
   functions are unit-testable without pulling in the full CLI), implement
   `items_to_retire_too_hard`.
2. Implement `items_to_flag_ceiling`.
3. Run the five RED tests, confirm all pass.
4. Wire `--mode=reference` CLI path using the pipeline components plus
   `items_to_retire_too_hard`.
5. Wire `--ceiling-check` / `--apply` / `--anchors` CLI paths using
   `items_to_flag_ceiling` and the report/apply gating logic.

### REFACTOR

If both pure functions and their CLI wiring end up in `main.rs`, extract
the pure functions into a `prober/bin/calibrate/src/filters.rs` module (or
a small `calibrate_core` lib crate) so they remain testable in isolation
from CLI parsing. No behavior change.

## Dependencies

Task 03 (bank), Task 04 (fanout), Task 05 (openrouter), Task 06 (grading), Task 07 (store).

## Files to Create/Modify

- `prober/bin/calibrate/src/main.rs` (modify — CLI wiring for both modes)
- `prober/bin/calibrate/src/filters.rs` (create — `items_to_retire_too_hard`, `items_to_flag_ceiling`, and the five unit tests)
- `prober/bin/calibrate/Cargo.toml` (modify — add path dependencies and `clap` via workspace)

## Acceptance Criteria

- All RED tests written and failing for the right reason (unimplemented filter functions).
- All tests GREEN with minimal implementation.
- REFACTOR pass complete, no regressions.
- `--ceiling-check` without `--apply` never calls `store.upsert_item_status`
  (verified by code inspection / manual run against a scratch DB showing
  no `item_status` rows change).
- `--mode=reference` correctly writes `retired_too_hard` only for items
  below the pass threshold, verified against a scratch DB with seeded
  reference-run results.
- `cargo test -p calibrate` (or the extracted lib crate) passes with zero warnings.

## Spec Updates

None.
