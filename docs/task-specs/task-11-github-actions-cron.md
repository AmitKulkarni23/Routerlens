# Task 11 — GitHub Actions Daily Cron Workflow

## Summary

Add a GitHub Actions workflow that runs daily on a cron schedule, builds
the `prober` workspace, and runs `probe` followed by `detect_incidents`
(and, on a separate manual/less-frequent trigger, `calibrate
--ceiling-check`) against the production Supabase database, using
repository secrets for credentials. The workflow must never print secret
values to logs.

## Read First

- `docs/system-specs/architecture.md` §2 (System overview) and §10
  (Security & secrets) — GitHub Actions is the sole scheduler; secrets
  `OPENROUTER_API_KEY` and `DATABASE_URL` live only in GitHub Actions
  secrets and local `.env`; repo is public, CI logs must not echo secrets.
- `README.md` "Secrets policy" — confirms which two secrets are required
  and that they are set in GitHub repository settings, never in code.

## Requirements

### Daily probe workflow

- MUST create `.github/workflows/daily-probe.yml` triggered on a `schedule`
  cron expression running once per day (implementer chooses an off-peak
  UTC time, documented in a workflow comment) and additionally on
  `workflow_dispatch` for manual runs.
- MUST install Rust stable and `cargo-lambda`/build tooling needed to
  compile the `prober` workspace (cargo-lambda is not required for this
  workflow since `prober` binaries are plain CLI, not Lambda — MUST use
  a standard `actions-rs`/`dtolnay/rust-toolchain` setup, not cargo-lambda).
- MUST run `cargo build --workspace --release` with `SQLX_OFFLINE=true`
  set (relying on the committed `.sqlx/` cache from Task 07 — no live DB
  connection needed at build time).
- MUST run `probe` (release binary) with `OPENROUTER_API_KEY` and
  `DATABASE_URL` sourced from `${{ secrets.OPENROUTER_API_KEY }}` and
  `${{ secrets.DATABASE_URL }}` set as step-level `env`, never printed via
  `echo`, `run: env`, or command-line arguments that would appear in the
  workflow's rendered log (pass via environment variables, not `--api-key`
  flags).
- MUST run `detect_incidents` (release binary) as a subsequent step in the
  same job, after `probe` completes, using the same `DATABASE_URL` secret.
- MUST set `permissions: contents: read` at the workflow or job level
  (least privilege — this workflow does not need write access).
- MUST NOT set `continue-on-error: true` on the `probe` or `detect_incidents`
  steps — a failed probe run must fail the workflow visibly.

### Secret handling

- The workflow file MUST include a comment stating that
  `OPENROUTER_API_KEY` and `DATABASE_URL` must be added manually as
  repository secrets in GitHub repo settings before this workflow can run
  successfully — this is a manual prerequisite outside the workflow file's
  control, not something the workflow can provision itself.
- No step MUST use `run: echo ${{ secrets.* }}` or otherwise pass a secret
  through a shell construct that could leak it to stdout (e.g. `set -x`
  combined with secret env vars).

## TDD Plan

N/A — CDK/CI-config task; not unit tested per project testing policy
(architecture.md §11: "NO tests for scaffolding, persistence glue, or CI
config beyond compile/dry-run checks"). Verify by triggering the workflow
manually via `workflow_dispatch` against a scratch/staging `DATABASE_URL`
secret and confirming the run completes and no secret value appears in the
workflow's log output.

## Dependencies

Task 08 (probe binary), Task 10 (detect-incidents binary).

## Files to Create/Modify

- `.github/workflows/daily-probe.yml` (create)

## Acceptance Criteria

- All RED tests written and failing for the right reason: N/A, no tests in this task.
- All tests GREEN with minimal implementation: N/A.
- REFACTOR pass complete, no regressions: N/A.
- Workflow YAML is valid (passes GitHub's workflow syntax check on push/PR,
  visible as a green check in the Actions tab or via `actionlint` if
  available locally).
- Manual `workflow_dispatch` run completes successfully against a scratch
  database with secrets configured.
- Log output from a manual run contains no substring matching the real
  `OPENROUTER_API_KEY` or `DATABASE_URL` values used (spot-checked).

## Spec Updates

None. Note for the implementer: this workflow will not function until a
human manually adds `OPENROUTER_API_KEY` and `DATABASE_URL` as repository
secrets in GitHub settings — that step cannot be automated by this task and
is out of scope for the code change itself.
