# Routerlens

Per-provider quality monitoring for OpenRouter. OpenRouter routes one model ID to many hosting providers (Groq, DeepInfra, Novita, Together, ...), each possibly serving a different quantization — so "the same model" varies in quality by provider. OpenRouter routes on price/speed/uptime, not output quality. Routerlens measures it: a Rust prober sends a fixed question bank to the same model **pinned to each provider** (fallbacks off), grades responses **mechanically** (no LLM judge), and appends timestamped results to Postgres. A public dashboard shows per-provider accuracy, reliability, latency, cost-per-correct-answer, and detected incidents.

**The accumulated time series is the product.** The code is deliberately simple and public — anyone can clone it in an afternoon; they cannot clone weeks of measurement history.

## Stack

| Layer | Tech |
|-------|------|
| Prober | Rust stable, cargo workspace — tokio, reqwest (rustls), serde, clap, sqlx, thiserror, uuid, chrono |
| DB | Supabase (Postgres) |
| Frontend | React + Vite + Material UI, direct Supabase reads (anon key + RLS) |
| CI / Cron | GitHub Actions (daily run) |
| Frontend deploy | Vercel |
| LLM API | OpenRouter (`https://openrouter.ai/api/v1`) |

## Probe Configuration

- Model: `meta-llama/llama-3.3-70b-instruct`
- Probed providers: Groq (quant undisclosed), DeepInfra (fp8), Novita (bf16), Together (fp8)
- Calibration reference: CoreWeave (fp16)
- Fan-out: 80 items × 4 providers × 3 repeats = 960 calls/run, daily (OpenRouter limit: 1000 calls/day)
- Provider pinning: `provider: { order: ["<name>"], allow_fallbacks: false }` in the chat completions request

## Project Structure

```
prober/            # Rust cargo workspace (probe, grade, calibrate, detect-incidents)
data/              # question_bank.json — versioned question bank
frontend/          # React SPA (Vercel)
supabase/          # SQL migrations, RLS policies, views
docs/
  system-specs/    # High-level architecture
  task-specs/      # Implementable task specs
  roadmap.md       # Future product directions
.github/workflows/ # Daily probe cron
```

## Task Workflow

- **Before starting any implementation work, read `docs/TASKS.md`** — it is the single source of truth for what is done and what to pick up next. Respect the wave ordering and task dependencies.
- Claim a task by setting its status to `in_progress`; when finished, set it to `done` with the date, append a line to the Done log, and commit the `docs/TASKS.md` update together with the task's changes.
- Full specs for each task are in `docs/task-specs/`.

## Testing Policy

- Unit tests ONLY for critical business logic: grading functions, calibration filtering, incident detection, work-item fan-out.
- NO frontend unit tests.
- Do not add tests beyond this scope.

## Conventions

- No secrets in the repo, ever. `.env` is gitignored; CI uses GitHub Actions secrets (`OPENROUTER_API_KEY`, `DATABASE_URL`). Supabase anon key is public by design; service-role key never leaves CI/local env.
- Grading is mechanical only: numeric, exact, exact_nospace, json (strip markdown fences → parse → deep equal). Never an LLM judge.
- No ranking or winner-picking language in UI — show measurements, nothing more.
- Structured logging in the prober; every call appends a row whether it succeeded or not.
- Commit messages: one short phrase.
- After editing any file, commit and push.
