# Deployment Guide

This guide covers the one-time manual setup required to run Routerlens in production. None of these steps can be automated by code in this repository — they require dashboard access to Supabase, Vercel, and GitHub.

## Manual Prerequisites

### 1. Create Supabase Project

1. Sign in at [supabase.com](https://supabase.com) and create a new project.
2. Once provisioned, apply the migrations from `supabase/migrations/` in order:
   - Option A: `supabase db push` (requires Supabase CLI linked to your project).
   - Option B: Open the SQL editor and run each `.sql` file in numeric order (`0001_`, `0002_`, …).
3. From **Project Settings → API**, copy the **Project URL** and **anon public key**.

### 2. Create Vercel Project

1. Sign in at [vercel.com](https://vercel.com) and create a new project linked to this GitHub repository.
2. Set the **Root Directory** to `frontend/`.
3. Vercel will pick up `frontend/vercel.json` and use `bun run build` automatically.
4. In **Settings → Environment Variables**, add the following for **Production** and **Preview** environments:

   | Variable | Value |
   |----------|-------|
   | `SUPABASE_URL` | Your Supabase project URL (from step 1) |
   | `SUPABASE_ANON_KEY` | Your Supabase anon public key (from step 1) |

   These variables are consumed **server-side** by `frontend/api/` serverless functions only. They must **not** use the `VITE_` prefix (which would inline them into the browser bundle).

5. The Vercel project must **not** receive `OPENROUTER_API_KEY` or the service-role `DATABASE_URL` — those belong to GitHub Actions only.

### 3. Add GitHub Actions Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret name | Value |
|-------------|-------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `DATABASE_URL` | Supabase **service-role** PostgreSQL connection string |

The `DATABASE_URL` here is the direct Postgres URL (found in **Project Settings → Database → Connection string**, using the **service-role** password), **not** the anon key. The service-role key bypasses RLS and is the write credential for the prober.

These secrets are separate from Vercel's environment variables and must **not** be added to Vercel.

### 4. Trigger First Run

1. Go to **Actions → daily-probe → Run workflow** and trigger a manual run via `workflow_dispatch`.
2. Confirm the run completes without errors and `calls` rows appear in the Supabase SQL editor.
3. Once confirmed, the `0 2 * * *` cron schedule takes over for daily runs.

## Architecture Notes

- **Vercel** serves the static SPA (`dist/`) and the read-only API (`frontend/api/*`). The API uses the anon key server-side against RLS-restricted views.
- **GitHub Actions** runs the prober (`probe`, `detect_incidents`) using the service-role `DATABASE_URL`. The service-role key never reaches Vercel.
- **Local development**: copy `.env.example` to `.env` and fill in credentials. `SQLX_OFFLINE=true cargo build --workspace` for the prober; `vercel dev` for the frontend.
