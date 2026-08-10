# Task 01 — Repo Scaffolding

## Summary

Establish the base repository layout for Routerlens so every subsequent task
has a compiling, buildable skeleton to add code to. This task creates the
Rust cargo workspace under `prober/` with empty-but-compiling member crates
and binaries, the frontend Vite + React + TypeScript + MUI scaffold, the
`supabase/` and `.github/workflows/` directories, and the root secrets
template. No business logic is written in this task — only structure,
manifests, and stub files sufficient for `cargo build --workspace` and
`bun run build` to succeed.

## Read First

- `README.md` — "Project Structure" and "Running locally" sections define
  the exact directory layout and command entrypoints this task must produce.
- `docs/system-specs/architecture.md` §2 (System overview) and §11 (Testing
  policy) — confirms the five components (bank, prober, database, scheduler,
  dashboard) and that scaffolding itself is not unit-tested.

## Requirements

### Rust workspace (`prober/`)

- `prober/Cargo.toml` MUST declare a workspace with members: `crates/bank`,
  `crates/fanout`, `crates/openrouter`, `crates/grading`, `crates/store`,
  `bin/probe`, `bin/calibrate`, `bin/detect_incidents`.
- Each `crates/*` member MUST be a library crate (`lib.rs`) that compiles
  with no content beyond a crate-level doc comment stating its future
  purpose (one line, referencing the task number that will implement it).
- Each `bin/*` member MUST be a binary crate (`main.rs`) with a `fn main()`
  that prints its own name and exits 0.
- Shared dependency versions (tokio, reqwest, serde, clap, sqlx, thiserror,
  uuid, chrono) MUST be declared once in `[workspace.dependencies]` in the
  root `prober/Cargo.toml` and referenced via `{ workspace = true }` in each
  member's `Cargo.toml`.
- `reqwest` MUST be configured with `default-features = false` and the
  `rustls-tls` feature (no `native-tls`).
- `sqlx` MUST be configured for offline mode (`SQLX_OFFLINE=true` documented
  in a comment in `prober/README.md` or top-level `.sqlx/` placeholder
  `.gitkeep`) so CI can build without a live database connection.
- `cargo build --workspace` MUST succeed with zero warnings from a clean
  checkout.

### Frontend scaffold (`frontend/`)

- MUST be created via Vite's React + TypeScript template, using Bun as the
  package manager (`bun create vite frontend --template react-ts` or
  equivalent manual `package.json`).
- MUST add `@mui/material`, `@emotion/react`, `@emotion/styled`, and
  `@supabase/supabase-js` as dependencies (latest 7.x for MUI, unpinned
  minor version).
- MUST include a placeholder `src/App.tsx` that renders a single MUI
  `Typography` reading "Routerlens" — enough to prove the toolchain wires up.
- `bun install && bun run build` MUST succeed with zero errors.
- MUST NOT include any test runner/framework setup (no frontend unit tests
  per project testing policy).

### Supabase, CI, and env scaffolding

- `supabase/migrations/` MUST exist (empty, with `.gitkeep`) — populated by
  Task 02.
- `.github/workflows/` MUST exist (empty, with `.gitkeep`) — populated by
  Task 11.
- Root `.env.example` MUST list `OPENROUTER_API_KEY=` and `DATABASE_URL=`
  with placeholder (empty or dummy) values and a comment noting these are
  never committed with real values.
- Root `.gitignore` MUST exclude `.env`, `target/`, `node_modules/`,
  `dist/`, and `.sqlx/query-*.json` MUST NOT be ignored (offline query
  cache is committed intentionally).

## TDD Plan

N/A — scaffolding task with no business logic. Project testing policy
(architecture.md §11) restricts unit tests to grading, fan-out, calibration
filtering, and incident detection only; scaffolding is explicitly out of
scope. Verify via `cargo build --workspace` and `bun run build` succeeding.

## Dependencies

None.

## Files to Create/Modify

- `prober/Cargo.toml` (create)
- `prober/crates/bank/Cargo.toml`, `prober/crates/bank/src/lib.rs` (create)
- `prober/crates/fanout/Cargo.toml`, `prober/crates/fanout/src/lib.rs` (create)
- `prober/crates/openrouter/Cargo.toml`, `prober/crates/openrouter/src/lib.rs` (create)
- `prober/crates/grading/Cargo.toml`, `prober/crates/grading/src/lib.rs` (create)
- `prober/crates/store/Cargo.toml`, `prober/crates/store/src/lib.rs` (create)
- `prober/bin/probe/Cargo.toml`, `prober/bin/probe/src/main.rs` (create)
- `prober/bin/calibrate/Cargo.toml`, `prober/bin/calibrate/src/main.rs` (create)
- `prober/bin/detect_incidents/Cargo.toml`, `prober/bin/detect_incidents/src/main.rs` (create)
- `frontend/` full Vite scaffold (create — package.json, vite.config.ts, src/App.tsx, index.html, tsconfig.json)
- `supabase/migrations/.gitkeep` (create)
- `.github/workflows/.gitkeep` (create)
- `.env.example` (create)
- `.gitignore` (create)

## Acceptance Criteria

- All RED tests written and failing for the right reason: N/A, no tests in this task.
- All tests GREEN with minimal implementation: N/A.
- REFACTOR pass complete, no regressions: N/A.
- `cargo build --workspace` succeeds from a clean checkout.
- `bun install && bun run build` succeeds in `frontend/`.
- `supabase/migrations/` and `.github/workflows/` directories exist and are tracked by git (via `.gitkeep`).
- `.env.example` exists and `.env` is gitignored.

## Spec Updates

None — this task implements the structure already documented in `README.md`
and `docs/system-specs/architecture.md`; no spec content changes.
