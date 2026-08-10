# Task 08 — Probe Binary

## Summary

Wire the `bank`, `fanout`, `openrouter`, `grading`, and `store` crates
together into the `probe` binary: the daily entrypoint that loads the
question bank, builds work items, calls OpenRouter per item with bounded
concurrency, grades and persists every outcome, and finalizes the run
status. Includes a `--dry-run` mode that runs the full pipeline against a
stub OpenRouter client (no network calls, no cost) so the wiring can be
exercised in CI and locally without an API key.

## Read First

- `docs/system-specs/architecture.md` §4 (Pipeline) — the full sequence
  this binary MUST implement: read bank → build work items → for each work
  item (bounded concurrency, per-provider pacing) call OpenRouter → grade
  iff `call_ok` → append row → finalize run status.
- `docs/system-specs/architecture.md` §3 — probed providers (Groq,
  DeepInfra, Novita, Together), fan-out totals (960 calls/day).
- `README.md` "Running locally" — the exact invocation shape:
  `cargo run -p probe -- --bank ../data/question_bank.json`.
- `docs/system-specs/architecture.md` §11 — "a `--dry-run` flag lets the
  prober execute the full pipeline against a stub" is a hard requirement,
  not optional polish.

## Requirements

### CLI surface

- MUST use `clap` (derive API) with flags: `--bank <path>` (default
  `../data/question_bank.json`), `--database-url <url>` (default: read
  from `DATABASE_URL` env var), `--providers <comma-separated>` (default
  `groq,deepinfra,novita,together`), `--repeats <u32>` (default from the
  bank's `repeats_per_item`, overridable), `--seed <u64>` (default a fixed
  constant so default runs are reproducible), `--concurrency <usize>`
  (default a sane bounded value, e.g. 8), `--dry-run` (boolean flag, no
  default value needed beyond `false`).
- MUST NOT log the `OPENROUTER_API_KEY` or `DATABASE_URL` values in any log
  line, error message, or panic output.

### Pipeline wiring

- MUST call `bank::load_bank`, then `fanout::build_work_items`, in that
  order; MUST exit non-zero with a clear error message (not a panic) if
  bank loading fails.
- MUST call `store.start_run(...)` before issuing any OpenRouter calls, and
  `store.finish_run(...)` after all work items are processed (success or
  failure path both reach `finish_run`).
- MUST process work items with bounded concurrency (e.g. `tokio::sync::Semaphore`
  sized by `--concurrency`) — MUST NOT fire all 960 requests unbounded.
- For each work item, MUST call the OpenRouter client (or the dry-run stub),
  then grade the response only when `call_ok == true` AND the item's status
  (from `store.get_item_status_map()`) is `active` or `anchor`
  (`retired_*` items MUST still be called and persisted for continuity of
  measurement, but architecture.md §6 states aggregate scoring excludes
  them — grading them or not is an implementer choice; if graded, the
  `pass` value MUST still be computed identically) — then persist via
  `store.insert_call`.
- MUST set `runs.status = completed` if every work item was processed
  without an unrecoverable pipeline error, `partial` if some work items
  could not be attempted (e.g. the process was interrupted after starting
  but before finishing all items) and at least one call row was written,
  `failed` if no call rows were written at all.

### Dry-run mode

- `--dry-run` MUST substitute a stub implementation of the OpenRouter call
  that returns synthetic `CallOutcome`s (a deterministic mix of pass/fail
  outcomes derived from the work item, no network I/O) instead of calling
  `openrouter::OpenRouterClient`.
- `--dry-run` MUST still exercise `bank::load_bank`, `fanout::build_work_items`,
  `grading::grade`, and the full `store` write path (dry-run affects only
  the OpenRouter call, not persistence) — a real database connection is
  still required unless the implementer also adds an in-memory store stub
  (not required by this spec; `--dry-run` scopes network stubbing only).
- `--dry-run` output MUST print a summary (work item count, pass count,
  fail count) to stdout on completion.

## TDD Plan

N/A — this binary is wiring/glue over already-implemented crates
(bank, fanout, openrouter, grading, store), not one of the four categories
(grading, fan-out, calibration filtering, incident detection) the project
testing policy (architecture.md §11) scopes unit tests to. Verified via
`--dry-run` execution, not unit tests.

## Dependencies

Task 03 (bank), Task 04 (fanout), Task 05 (openrouter), Task 06 (grading), Task 07 (store).

## Files to Create/Modify

- `prober/bin/probe/src/main.rs` (modify — implement the clap CLI and full pipeline wiring)
- `prober/bin/probe/Cargo.toml` (modify — add `bank`, `fanout`, `openrouter`, `grading`, `store` path dependencies, `clap`, `tokio`, `tracing`, `tracing-subscriber` via workspace)

## Acceptance Criteria

- All RED tests written and failing for the right reason: N/A, no tests in this task.
- All tests GREEN with minimal implementation: N/A.
- REFACTOR pass complete, no regressions: N/A.
- `cargo run -p probe -- --dry-run --database-url <scratch-db-url>` completes
  and prints a summary with work item count `== items × providers × repeats`.
- No secret value appears in stdout/stderr under any flag combination
  (manually verified by grepping output for the literal API key/DB URL
  used in the test invocation).
- `cargo build -p probe` compiles with no warnings.

## Spec Updates

None.
