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
| 01 | Repo scaffolding (cargo workspace, frontend, supabase/, workflows) | [spec](task-specs/task-01-repo-scaffolding.md) | todo | |
| 02 | Supabase schema, migrations, RLS, aggregate views | [spec](task-specs/task-02-supabase-schema.md) | todo | |
| 03 | Question bank loader + validation | [spec](task-specs/task-03-bank-loader.md) | todo | |
| 04 | Work-item fan-out builder | [spec](task-specs/task-04-fanout-builder.md) | todo | |
| 05 | OpenRouter client + CallOutcome capture | [spec](task-specs/task-05-openrouter-client.md) | todo | |
| 06 | Grading module | [spec](task-specs/task-06-grading-module.md) | todo | |
| 07 | Persistence layer (store crate) | [spec](task-specs/task-07-persistence-layer.md) | todo | |
| 08 | Probe binary | [spec](task-specs/task-08-probe-binary.md) | todo | |
| 09 | Calibrate binary | [spec](task-specs/task-09-calibrate-binary.md) | todo | |
| 10 | Detect-incidents binary | [spec](task-specs/task-10-detect-incidents-binary.md) | todo | |
| 11 | GitHub Actions daily cron workflow | [spec](task-specs/task-11-github-actions-cron.md) | todo | |
| 12 | Frontend dashboard | [spec](task-specs/task-12-frontend-dashboard.md) | todo | |
| 13 | Vercel deployment config + docs | [spec](task-specs/task-13-vercel-deployment.md) | todo | |

## Manual prerequisites (human-only, not agent tasks)

| Item | Status |
|------|--------|
| Create Supabase project | todo |
| Add GitHub Actions secrets: `OPENROUTER_API_KEY`, `DATABASE_URL` | todo |
| Create Vercel project, link repo | todo |
| Run pre-launch calibration (5× reference on CoreWeave) after task 09 | todo |
| Ceiling-item review 1 week after launch (`calibrate --ceiling-check`) | todo |

## Done log

(append one line per completed task: date, task #, one-phrase note)
