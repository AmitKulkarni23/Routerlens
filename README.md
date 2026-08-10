# Routerlens

**Per-provider quality monitoring for OpenRouter.**

[OpenRouter](https://openrouter.ai) is a *router*: the same model ID (`meta-llama/llama-3.3-70b-instruct`, ...) is forwarded to different hosting providers — Groq, DeepInfra, Novita, Together, Fireworks — each of which may serve a different quantization. So "the same model" varies in quality depending on who you get routed to. OpenRouter routes on price, speed, and uptime — **not output quality** — because nobody measures per-provider quality.

Routerlens measures it.

## How it works

1. **Probe.** A Rust prober reads a fixed question bank (`data/question_bank.json`) and fans out work items: `item × provider × repeat` (80 items × 4 providers × 3 repeats = 960 calls). Each call pins the model to one provider with fallbacks disabled.
2. **Grade.** Responses are graded **mechanically** — numeric comparison, exact match, whitespace-stripped match, or JSON deep-equal after stripping markdown fences. No LLM judge, ever.
3. **Record.** Every call — pass, fail, or transport error — is appended as a timestamped row in Postgres (Supabase). Latency, cost, finish reason, and error kind are recorded alongside correctness.
4. **Detect.** A provider whose daily pass rate drops ≥10 points below its 7-day rolling mean gets an incident row: *"Provider X dropped 11 points overnight."*
5. **Show.** A public dashboard (React SPA + a thin Vercel serverless read API) displays per-provider accuracy, reliability, latency, cost-per-correct-answer, and incidents. No ranking, no winner-picking — measurements, honestly displayed.

## Why the code is public

The code is deliberately simple. A strong engineer can clone it in an afternoon. They cannot clone weeks of accumulated measurement history. **The time series is the product.**

## Calibration

Raw benchmark items measure the model, not the provider. Routerlens calibrates:

- Run the full bank 5× against a reference provider (CoreWeave, fp16 — the highest-precision serving).
- Drop any item the reference passes <4/5 — too hard; it measures the model.
- After one week live, flag items every provider passes 100% — ceiling; retire most, keep a few as anchors.
- The aggregate score = % of **calibrated** items passed, per provider.

## Stack

| Layer | Tech |
|-------|------|
| Prober | Rust (tokio, reqwest, serde, clap, sqlx) |
| Database | Supabase (Postgres) |
| Frontend | React + Vite + Material UI |
| Cron | GitHub Actions, daily |
| Hosting | Vercel (frontend), Supabase (data) |

## Running locally

Prerequisites: Rust stable, Bun (or Node 20+), a Supabase project, an OpenRouter API key.

```bash
# 1. Configure secrets — NEVER commit these
cp .env.example .env
# fill in OPENROUTER_API_KEY and DATABASE_URL

# 2. Apply DB migrations
# (see supabase/ for SQL; apply via supabase CLI or the SQL editor)

# 3. Run the prober
cd prober
cargo run -p probe -- --bank ../data/question_bank.json

# 4. Run the dashboard
cd frontend
bun install && bun run dev
```

The browser never talks to Supabase. The SPA fetches JSON from Vercel serverless functions (`frontend/api/*`), which query Supabase server-side with the anon key (`SUPABASE_URL` / `SUPABASE_ANON_KEY` env vars). RLS restricts the anon role to read-only `SELECT` on aggregate views as defense in depth. The service-role key and OpenRouter key exist only in `.env` locally and in GitHub Actions secrets in CI. Local dev: `vercel dev` runs the SPA and the API functions together.

## Secrets policy

- `.env` is gitignored. `.env.example` documents required variables with placeholder values.
- CI secrets: `OPENROUTER_API_KEY`, `DATABASE_URL` — set in GitHub repository settings, never in code.
- The Supabase anon key is public by design (RLS is the boundary), but it lives only in Vercel env vars and local `.env` — it is never embedded in the browser bundle or committed.

## Docs

- `docs/system-specs/` — architecture
- `docs/task-specs/` — implementable task breakdown
- `docs/roadmap.md` — where this goes next
