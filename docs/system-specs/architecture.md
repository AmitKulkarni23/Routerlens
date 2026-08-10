# Routerlens — High-Level Architecture

## 1. Problem

OpenRouter multiplexes one model ID across many hosting providers. Providers differ in quantization (fp16 / bf16 / fp8 / undisclosed), serving stack, and operational quality. OpenRouter's routing optimizes price, speed, and uptime — output quality is unmeasured. Routerlens produces the missing signal: a per-provider quality time series for a pinned model, built from mechanical grading of a calibrated question bank.

**Moat statement:** the code is simple and public; the accumulated measurement history is not clonable. The time series is the product.

## 2. System overview

```
                      GitHub Actions (daily cron)
                              │
                              ▼
 data/question_bank.json ─▶ prober (Rust) ──▶ OpenRouter API
                              │                 (1 call per work item,
                              │                  pinned provider,
                              │                  fallbacks off)
                              ▼
                       Supabase Postgres
                       (append-only calls, runs,
                        incidents; aggregate views)
                              ▲
                              │  anon key (server-side), read-only RLS
                              │
                   Vercel serverless functions (/api/*)
                              ▲
                              │  JSON over HTTPS
                              │
                  React dashboard (Vite SPA on Vercel)
```

Components:

1. **Question bank** — `data/question_bank.json`, versioned in git.
2. **Prober** — Rust cargo workspace; binaries for `probe`, `calibrate`, `detect-incidents`.
3. **Database** — Supabase Postgres; append-only fact tables + SQL views for the read API.
4. **Scheduler** — GitHub Actions cron, daily.
5. **Dashboard** — React + Vite + MUI SPA plus a thin Vercel serverless read API (`/api/*`), mirroring the RedditScraper project's pattern. The browser talks only to `/api/*`; the functions query Supabase views server-side with the anon key. No Supabase URL or key ever reaches the browser.

## 3. Probe configuration

| Setting | Value | Rationale |
|---|---|---|
| Model | `meta-llama/llama-3.3-70b-instruct` | 13 OpenRouter endpoints; widest provider overlap; quantization spread is the story |
| Probed providers | Groq (quant undisclosed), DeepInfra (fp8), Novita (bf16), Together (fp8) | Recognizable names, mixed quantizations |
| Reference provider | CoreWeave (fp16) | Highest-precision serving; calibration only |
| Fan-out | 80 items × 4 providers × 3 repeats = 960 calls | Fits OpenRouter's 1000 calls/day limit |
| Cadence | Daily (GitHub Actions cron) | Rate-limit constraint; revisit if limit changes |
| Pinning | `"provider": {"order": ["<name>"], "allow_fallbacks": false}` | Guarantees which provider answered |

## 4. Pipeline

```
read bank JSON
  → build work items (item × provider × repeat), shuffled
  → for each work item (bounded concurrency, per-provider pacing):
      one pinned HTTP call to OpenRouter /chat/completions
      → CallOutcome { call_ok, raw_response, finish_reason, latency_ms, cost_usd, error_kind }
  → grade iff call_ok (mechanical, per item's grade type)
  → append one row per call to Postgres (pass, fail, and transport errors alike)
  → after run completes: incident detection over daily aggregates
```

Failure semantics:

- A transport/HTTP/rate-limit error is **data**, not a retry loop: record `call_ok = false` with `error_kind` (timeout, http_4xx, http_5xx, rate_limited, malformed_response). Reliability is a product metric — this is the client-observed failure rate OpenRouter's own telemetry can't see.
- One bounded retry only for rate-limit responses (with backoff); everything else records first outcome.
- A partially completed run is still a valid run; `runs.status` records `completed` / `partial` / `failed`.

## 5. Question bank format

```jsonc
{
  "version": 1,
  "system_prompt": "You are taking a test. Answer exactly as instructed. Output nothing except the answer.",
  "max_tokens": 100,
  "repeats_per_item": 3,
  "items": [
    {
      "id": "arith-001",
      "category": "arithmetic",
      "difficulty": "easy",       // easy | medium | hard
      "prompt": "What is 17 + 26? Answer with the number only.",
      "answer": "43",
      "grade": "numeric"          // numeric | exact | exact_nospace | json
    }
  ]
}
```

Categories (8 items each, 80 total): `arithmetic`, `code_output`, `string_ops`, `instruction_following`, `factual_recall`, `logic`, `extraction`, `structured_output`, `sequences`, `conversion_dates`.

### Grading (mechanical only — no LLM judge, ever)

| Grade | Rule |
|---|---|
| `numeric` | Strip whitespace/commas/trailing period, parse both sides as f64, compare with small epsilon |
| `exact` | Trim outer whitespace, compare strings byte-equal |
| `exact_nospace` | Remove ALL whitespace from both sides, then compare |
| `json` | Strip markdown code fences if present, parse both sides as JSON, deep-equal |

Grading is pure-function Rust — the primary target of unit tests.

## 6. Calibration

Items must measure the *provider*, not the *model*.

1. **Pre-launch:** run the full bank 5× against the reference provider (CoreWeave fp16). Drop any item passing <4/5 — too hard / ambiguous.
2. **Post-launch (after 1 week):** flag items every probed provider passes 100% — ceiling items. Retire most; keep a few as **anchors** (canaries whose failure signals gross degradation).
3. Item status lives in the `item_status` table: `active | retired_too_hard | retired_ceiling | anchor`.
4. **Aggregate score = % of calibrated (active + anchor) items passed.** Retirement excludes items from future aggregates but historical rows are never deleted.

## 7. Data model (Supabase Postgres)

```sql
runs (
  id uuid pk, started_at timestamptz, finished_at timestamptz,
  bank_version int, git_sha text, status text  -- completed|partial|failed
)

calls (            -- append-only fact table; one row per API call
  id uuid pk, run_id fk, item_id text, category text, provider text,
  repeat_idx int, call_ok bool, pass bool null,   -- null when not graded
  raw_response text, finish_reason text, latency_ms int,
  cost_usd numeric, error_kind text null, created_at timestamptz
)

item_status (
  item_id text pk, status text, reason text, updated_at timestamptz
)

incidents (
  id uuid pk, provider text, detected_at timestamptz,
  metric text,               -- 'pass_rate'
  baseline numeric, observed numeric, delta numeric,
  resolved_at timestamptz null
)
```

Dashboard reads go through SQL **views** (e.g. `daily_provider_stats`: pass rate, error rate, p50/p95 latency, cost per correct answer, by provider by day), queried by the Vercel serverless functions. RLS stays on as defense in depth: anon role gets `SELECT` on views only; fact tables are service-role only — even if the anon key leaked, it could only read the same public aggregates the API already serves. Writes happen exclusively via the prober's `DATABASE_URL` (service credentials, CI secret).

## 8. Incident detection

Per provider, after each run: compare today's pass rate against the 7-day rolling mean (excluding today). If drop ≥ 10 percentage points and ≥ 7 days of history exist, insert an incident row. An open incident resolves when pass rate returns within 3 points of baseline. Mechanical, explainable, no tuning knobs beyond the two thresholds (config constants).

## 9. Dashboard (v1 scope)

Read API (Vercel serverless functions under `frontend/api/`, TypeScript):

| Endpoint | Serves |
|---|---|
| `GET /api/providers` | Latest per-provider stats for the overview cards |
| `GET /api/timeseries` | Daily pass rate per provider for the hero chart |
| `GET /api/incidents` | Open + recently resolved incidents |
| `GET /api/categories` | Per-provider per-category pass rates |

Functions read `SUPABASE_URL` / `SUPABASE_ANON_KEY` from Vercel env vars (server-side only — no `VITE_` prefix, nothing embedded in the browser bundle) and query only the RLS-exposed views. Pages:

- Per-provider overview cards: current pass rate, 7-day trend, error rate, median latency, cost per correct answer.
- Time-series chart: pass rate per provider over time (the hero visual).
- Incidents feed: "Groq dropped 11 points on 2026-08-08."
- Category breakdown table per provider.
- Methodology page: what is measured, how grading works, calibration rules — transparency is the credibility.
- No ranking, no "winner" — neutral presentation.

## 10. Security & secrets

- `OPENROUTER_API_KEY`, `DATABASE_URL`: GitHub Actions secrets + local `.env` (gitignored). Never committed; `.env.example` has placeholders.
- Supabase anon key is used only server-side in Vercel functions (env vars `SUPABASE_URL`, `SUPABASE_ANON_KEY` in Vercel project settings). It is public-by-design per Supabase's model, but this architecture never exposes it to the browser at all; RLS (read-only `SELECT` on views) remains as defense in depth.
- Repo is public; CI logs must not echo secrets.

## 11. Testing policy

Unit tests **only** for critical business logic:

- grading functions (all four grade types, edge cases: fences, commas, whitespace, malformed JSON)
- work-item fan-out (counts, shuffling determinism under seed)
- calibration filtering rules
- incident detection thresholds

No frontend unit tests (this includes the Vercel serverless functions — they are read-and-serialize glue). No integration-test harness against live OpenRouter in CI (cost + rate limit); a `--dry-run` flag lets the prober execute the full pipeline against a stub.

## 12. Out of scope for v1

Multiple models, subscriptions/RSS, webhooks, "OpenRouter Wrapped", bring-your-own-test-set (see `docs/roadmap.md`), auth, admin UI.
