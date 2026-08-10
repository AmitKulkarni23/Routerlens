# Task 13 — Vercel Deployment Config and Docs

## Summary

Add the Vercel project configuration for deploying `frontend/` as a static
Vite build, and document the manual one-time setup steps (Vercel project
creation, Supabase project creation, environment variable configuration)
that cannot be automated by code in this repository. This task produces
config files and documentation only — it does not create the Vercel or
Supabase accounts/projects themselves, per explicit scope boundary.

## Read First

- `README.md` "Running locally" and "Secrets policy" — the two secrets
  categories (`.env` for local, GitHub Actions secrets for CI) and the
  distinct frontend env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  from Task 12) that Vercel's project settings must also carry.
- `docs/system-specs/architecture.md` §2 and §10 — Vercel hosts the static
  frontend only; it never holds `OPENROUTER_API_KEY` or the service-role
  `DATABASE_URL` (those belong to GitHub Actions/local `.env` only, per
  Task 11).

## Requirements

### Vercel configuration files

- MUST create `frontend/vercel.json` (or root-level `vercel.json` with a
  `frontend` root directory setting — implementer's choice, document which)
  configuring: build command (`bun run build` or equivalent), output
  directory (`dist`), and framework preset for Vite.
- MUST ensure the config does NOT embed any secret value — only
  build/output settings; environment variables (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`) MUST be referenced as Vercel project
  environment variables, never hardcoded into `vercel.json` or any
  committed file.
- MUST add a `frontend/.vercelignore` (or confirm `.gitignore` already
  covers `node_modules/`, `dist/`) so build artifacts are not shipped in
  the repo.

### Deployment documentation

- MUST add a `docs/deployment.md` (or extend `README.md`'s existing
  sections — implementer's choice) covering, as a numbered manual
  prerequisite checklist:
  1. Create a Supabase project; apply migrations from `supabase/migrations/`
     (via `supabase db push` or SQL editor); copy the project's anon key
     and URL.
  2. Create a Vercel project linked to this repository's `frontend/`
     directory; set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
     Vercel project environment variables (Production and Preview).
  3. Add `OPENROUTER_API_KEY` and `DATABASE_URL` (the Supabase
     service-role connection string, not the anon key) as GitHub repository
     secrets for the Task 11 workflow — explicitly note these are separate
     credentials from the Vercel/frontend env vars and MUST NOT be set on
     Vercel.
  4. Trigger the `daily-probe.yml` workflow manually once (via
     `workflow_dispatch`) to confirm end-to-end connectivity before relying
     on the schedule.
- The documentation MUST explicitly state that none of these four steps
  can be performed by this task's code changes — they require dashboard
  access to Vercel, Supabase, and GitHub repository settings.

## TDD Plan

N/A — deployment configuration and documentation task, not unit tested per
project testing policy (architecture.md §11 scopes tests to grading,
fan-out, calibration filtering, and incident detection only). Verify by
running `bun run build` locally against the same command Vercel will use
and confirming the `dist/` output is produced.

## Dependencies

Task 12 (frontend dashboard — this task deploys its build output).

## Files to Create/Modify

- `frontend/vercel.json` (create)
- `frontend/.vercelignore` (create, if `.gitignore` does not already sufficiently exclude build artifacts for Vercel's purposes)
- `docs/deployment.md` (create)

## Acceptance Criteria

- All RED tests written and failing for the right reason: N/A, no tests in this task.
- All tests GREEN with minimal implementation: N/A.
- REFACTOR pass complete, no regressions: N/A.
- `bun run build` in `frontend/` (the same command referenced in
  `vercel.json`) succeeds and produces a `dist/` directory.
- `vercel.json` contains no secret values (verified by manual review —
  only build/output/framework settings present).
- `docs/deployment.md` enumerates all four manual prerequisite steps above
  and explicitly states they require dashboard access outside this repo's
  code.

## Spec Updates

- `README.md` MAY be updated to link to `docs/deployment.md` if the
  implementer chooses to keep deployment docs in a separate file rather
  than inline.
