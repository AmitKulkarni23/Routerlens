# Task Tracker

Running list of implementation work. Any agent picking up work MUST read this first, claim a task by marking it `in_progress`, and update its status to `done` (with date) immediately after completing it. Full specs live in `docs/task-specs/`.

Statuses: `todo` | `in_progress` | `done` | `blocked`

## Wave plan (parallelizable within a wave; waves depend on earlier waves)

| Wave | Tasks |
|------|-------|
| 1 | 01 |
| 2 | 02, 03 |
| 3 | 04, 06, 12 |
| 4 | 05 |
| 5 | 07 |
| 6 | 08, 09, 10 |
| 7 | 11, 13 |

## Tasks

| # | Task | Spec | Status | Completed |
|---|------|------|--------|-----------|
| 01 | Repo scaffolding (cargo workspace, frontend, supabase/, workflows) | [spec](task-specs/task-01-repo-scaffolding.md) | done | 2026-08-09 |
| 02 | Supabase schema, migrations, RLS, aggregate views | [spec](task-specs/task-02-supabase-schema.md) | done | 2026-08-09 |
| 03 | Question bank loader + validation | [spec](task-specs/task-03-bank-loader.md) | done | 2026-08-09 |
| 04 | Work-item fan-out builder | [spec](task-specs/task-04-fanout-builder.md) | done | 2026-08-09 |
| 05 | OpenRouter client + CallOutcome capture | [spec](task-specs/task-05-openrouter-client.md) | done | 2026-08-09 |
| 06 | Grading module | [spec](task-specs/task-06-grading-module.md) | done | 2026-08-09 |
| 07 | Persistence layer (store crate) | [spec](task-specs/task-07-persistence-layer.md) | done | 2026-08-09 |
| 08 | Probe binary | [spec](task-specs/task-08-probe-binary.md) | done | 2026-08-09 |
| 09 | Calibrate binary | [spec](task-specs/task-09-calibrate-binary.md) | done | 2026-08-09 |
| 10 | Detect-incidents binary | [spec](task-specs/task-10-detect-incidents-binary.md) | done | 2026-08-09 |
| 11 | GitHub Actions daily cron workflow | [spec](task-specs/task-11-github-actions-cron.md) | done | 2026-08-09 |
| 12 | Frontend dashboard | [spec](task-specs/task-12-frontend-dashboard.md) | done | 2026-08-09 |
| 13 | Vercel deployment config + docs | [spec](task-specs/task-13-vercel-deployment.md) | done | 2026-08-09 |

## Manual prerequisites (human-only, not agent tasks)

| Item | Status |
|------|--------|
| Create Supabase project | todo |
| Add GitHub Actions secrets: `OPENROUTER_API_KEY`, `DATABASE_URL` | todo |
| Create Vercel project, link repo | done |
| Run pre-launch calibration (5× reference on CoreWeave) after task 09 | todo |
| Ceiling-item review 1 week after launch (`calibrate --ceiling-check`) | todo |

## Done log

(append one line per completed task: date, task #, one-phrase note)

2026-08-09, task 01, repo scaffold: Rust workspace + Vite frontend + gitkeep dirs
2026-08-09, task 02, Supabase schema: 3 migration files — tables, RLS, daily_provider_stats view
2026-08-09, task 03, bank crate: load_bank with typed structs and validation
2026-08-09, task 04, fanout crate: build_work_items with 4 passing unit tests
2026-08-09, task 06, grading crate: 4 grade strategies with 5 passing unit tests
2026-08-09, task 12, frontend dashboard: 5 pages, 4 API functions, migration 0004
2026-08-09, task 05, openrouter crate: CallOutcome, ErrorKind, rate-limit retry
2026-08-09, task 07, store crate: sqlx persistence for runs, calls, incidents, item_status
2026-08-09, task 08, probe binary: full pipeline wiring, dry-run stub, bounded concurrency
2026-08-09, task 09, calibrate binary: 5 filter unit tests, reference + ceiling-check modes
2026-08-09, task 10, detect_incidents binary: 4 unit tests, evaluate_incident, store wiring
2026-08-09, task 11, GitHub Actions cron: daily-probe.yml with probe + detect_incidents steps
2026-08-09, task 13, Vercel deployment: vercel.json, .vercelignore, docs/deployment.md
