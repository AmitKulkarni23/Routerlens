# High-Level Design: Chorus

## References
- Requirements: docs/system-specs/reqs-chorus.md
- Reference project: ~/TechProjects/ModelArena/

## 1. System Overview

Chorus is a single-page application that lets an anonymous visitor type one prompt, select 2–6 free-tier LLM models, and watch all responses stream side by side in real time. The frontend is a React SPA served via CloudFront + S3. Two Rust Lambda functions sit behind CloudFront — one proxies the OpenRouter model catalog (filtered to free-tier), the other fans the prompt out to N models concurrently and multiplexes their SSE streams back to the browser through a single response-streaming Lambda Function URL.

### Primary User Flow

```
Visitor loads page
  → Frontend fetches GET /api/models (free model catalog)
  → Visitor selects 2–6 models, types a prompt
  → Frontend opens SSE connection to POST /api/chorus
  → Backend fans out to N OpenRouter /chat/completions (stream: true) concurrently
  → Backend multiplexes per-model SSE chunks into a single stream, tagged by model ID
  → Frontend demuxes stream, routes tokens to the correct panel
  → Each panel renders markdown incrementally
  → Stream ends → done state per panel
```

## 2. Service Decomposition

### 2.1 Models Lambda

| Attribute | Value |
|-----------|-------|
| Responsibility | Proxy OpenRouter GET /models, filter to free-tier only, return simplified catalog |
| Language | Rust (Tokio + lambda_http) |
| AWS Services | Lambda (ARM64, PROVIDED_AL2023), Function URL |
| Why Lambda | Stateless, bursty, sub-second cold start with Rust |

Fetches the full OpenRouter model list, filters to models where all pricing fields are "0" or model ID contains `:free`, strips unnecessary fields, returns a compact JSON array of `{ id, name, provider }`. CloudFront caches this response (5-minute TTL) to avoid hammering OpenRouter.

Managed alternatives considered:
- **API Gateway + HTTP integration to OpenRouter** — rejected because we need server-side filtering logic, not a passthrough.

### 2.2 Chorus Lambda

| Attribute | Value |
|-----------|-------|
| Responsibility | Accept prompt + model IDs, fan out to OpenRouter concurrently, multiplex SSE streams back |
| Language | Rust (Tokio + lambda_runtime) |
| AWS Services | Lambda (ARM64, PROVIDED_AL2023), Function URL with RESPONSE_STREAM invoke mode |
| Why Lambda | Response streaming via Function URL solves SSE. Rust's async handles concurrent fan-out efficiently within a single invocation. |

Key design decisions:
- **Multiplexed single stream, not N separate connections.** The browser opens one SSE connection. The backend tags each chunk with the model ID so the frontend can demux. This avoids CORS/connection-limit issues with N parallel SSE connections from the browser, and keeps the architecture simpler.
- **Free-tier validation on the backend.** Before fanning out, Chorus Lambda fetches the current free-tier model list (or uses a short-lived cache) and rejects any model ID not on the list (FR-SEL-02, NFR-SEC-02).
- **Independent failure handling.** Each model's stream is a separate Tokio task. If one fails (429, 500, timeout), an error event is emitted for that model; others continue (FR-STREAM-04).
- **Timeout:** 300 seconds. Free-tier models can be slow; long timeout prevents premature cutoff.

Managed alternatives considered:
- **API Gateway WebSocket** — rejected; adds complexity (connection management, route keys) for a unidirectional stream that SSE handles natively.
- **AppSync subscriptions** — rejected; overkill for a PoC with no auth and no persistent state.

### 2.3 Frontend SPA

| Attribute | Value |
|-----------|-------|
| Responsibility | Model selection UI, prompt input, SSE consumption, side-by-side streaming markdown display |
| Tech | React 19, TypeScript, MUI 7, Vite, Bun runtime |
| Hosting | S3 bucket, served via CloudFront |

No server-side rendering. Static assets only. Bun used for local dev and build tooling.

## 3. Data Architecture

### 3.1 No Persistent Data Store

Chorus has no data store. No user accounts, no saved prompts, no history. Everything is ephemeral — the prompt goes in, streams come back, nothing is persisted.

Managed alternatives considered:
- **DynamoDB for prompt history** — out of scope per requirements.

### 3.2 Data Flow

```
┌──────────┐     GET /api/models      ┌──────────────┐    GET /models     ┌────────────┐
│ Frontend │ ◄──────────────────────── │  CloudFront  │ ──────────────────►│  Models    │
│  (SPA)   │                          │              │                    │  Lambda    │
│          │     POST /api/chorus      │              │    POST /chorus    │            │
│          │ ─────────────────────────►│              │ ──────────────────►│  Chorus    │
│          │ ◄──── SSE (multiplexed) ──│              │ ◄── SSE stream ───│  Lambda    │
└──────────┘                          └──────────────┘                    └─────┬──────┘
                                                                               │
                                                                      N concurrent
                                                                      POST /chat/completions
                                                                      (stream: true)
                                                                               │
                                                                               ▼
                                                                        ┌────────────┐
                                                                        │ OpenRouter │
                                                                        │   API      │
                                                                        └────────────┘
```

### 3.3 Multiplexed SSE Wire Format

Each SSE event from Chorus Lambda is tagged so the frontend can demux:

```
event: token
data: {"model_id": "google/gemma-2-9b-it:free", "content": "Hello"}

event: token
data: {"model_id": "meta-llama/llama-3-8b-instruct:free", "content": "Hi there"}

event: model_done
data: {"model_id": "google/gemma-2-9b-it:free"}

event: model_error
data: {"model_id": "mistralai/mistral-7b-instruct:free", "error": "429 rate limited"}

event: done
data: {}
```

Event types:
- `token` — incremental content chunk for a specific model
- `model_done` — a specific model's stream completed
- `model_error` — a specific model failed (others continue)
- `done` — all models finished (success or error), stream ends

## 4. API Surface

### Models Lambda

| Method | Path | Purpose | Sync/Async |
|--------|------|---------|------------|
| GET | /api/models | Return free-tier model catalog | Sync |

### Chorus Lambda

| Method | Path | Purpose | Sync/Async |
|--------|------|---------|------------|
| POST | /api/chorus | Fan-out prompt to selected models, return multiplexed SSE stream | Streaming (SSE) |

Request body for POST /api/chorus:
```json
{
  "prompt": "Explain quantum computing in simple terms",
  "model_ids": [
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3-8b-instruct:free"
  ]
}
```

Two endpoints total. That's the whole API.

## 5. Infrastructure

### AWS Architecture

```
                    ┌─────────────────────────────────┐
                    │          CloudFront              │
                    │  ┌───────────────────────────┐   │
                    │  │ /* → S3 (frontend)        │   │
                    │  │ /api/models* → Models URL  │   │
                    │  │ /api/chorus* → Chorus URL  │   │
                    │  └───────────────────────────┘   │
                    │  WAF ACL (AWS managed rules)     │
                    │  Security response headers       │
                    └─────────────────────────────────┘
                          │           │           │
                    ┌─────┘           │           └─────┐
                    ▼                 ▼                  ▼
              ┌──────────┐    ┌────────────┐    ┌────────────────┐
              │    S3    │    │  Models    │    │   Chorus       │
              │ Frontend │    │  Lambda   │    │   Lambda       │
              │ Bucket   │    │ (ARM64)   │    │ (ARM64)        │
              │          │    │ 256MB     │    │ 1024MB         │
              │          │    │ 30s TO    │    │ 300s TO        │
              │          │    │           │    │ RESPONSE_STREAM│
              └──────────┘    └────────────┘    └────────────────┘
```

### Key Infrastructure Decisions

- **Lambda Function URLs** (not API Gateway) — same pattern as ModelArena. Simpler, no additional cost, native response streaming support via `RESPONSE_STREAM` invoke mode.
- **CloudFront origin-verify header** — random secret injected at deploy time. Lambda rejects requests without it. Prevents direct Lambda URL access, forces traffic through CloudFront.
- **WAF ACL** — AWS managed rule sets on CloudFront. Basic protection without custom rules.
- **S3 + CloudFront for frontend** — standard static SPA hosting. Error responses redirect to index.html for client-side routing.
- **No custom domain** — PoC uses CloudFront's generated `*.cloudfront.net` domain.

### Deployment

- **Single CDK stack** (`ChorusStack`) — deploys everything in one `cdk deploy`.
- **No staged rollout** — PoC ships direct. No blue/green, no canary.
- **Build pipeline:** `make deploy` builds Rust lambdas (cargo-lambda --arm64), builds frontend (bun run build), runs cdk deploy.

## 6. NFR Design Decisions

### Performance → NFR-PERF-01 (LCP < 2s), NFR-PERF-02 (first token < 3s)

- **LCP < 2s:** Frontend is a static Vite bundle served from CloudFront edge. No SSR, no API calls blocking initial render. Model list loads after paint.
- **First token < 3s:** Chorus Lambda fans out all OpenRouter requests concurrently via Tokio tasks. Zero serialization between models. The first model to respond starts streaming immediately — no waiting for all models to be ready.
- **Models endpoint cached 15 min at CloudFront.** Free model list changes rarely. Longer TTL reduces OpenRouter load and improves availability during demos.
- **Frontend renders hardcoded fallback models** (3 popular free-tier models) immediately, fetches full list async. Worst case: partial model list but page is interactive.

### Security → NFR-SEC-01 (key not in frontend), NFR-SEC-02 (free-tier validation)

- **API key lives only in Lambda environment variables.** Set at deploy time from local `.env`. Never in frontend bundle, never in CDK output.
- **Free-tier validation:** Chorus Lambda maintains an in-memory set of valid free-tier model IDs with a 60-second TTL (re-fetched from OpenRouter when expired, with a 5-second timeout on the fetch). Rejects any model ID not in the set before making any OpenRouter call. If the fetch fails or times out, returns 503.
- **Origin-verify header** prevents direct Lambda URL access.
- **CSP headers** on CloudFront restrict connect-src to self only.

### Observability → NFR-OBS-01 (structured logging)

- **Structured JSON logging** via `tracing` + `tracing-subscriber` with JSON formatter, same as ModelArena.
- **Per-request log fields:** prompt length (chars), model IDs, per-model time-to-first-token, per-model outcome (success/error + error type), total duration, OpenRouter rate-limit headers (`x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after`) when present.
- **X-Ray tracing** enabled on both Lambdas for request tracing through CloudFront → Lambda → OpenRouter.
- **CloudWatch Logs** — default retention, no custom metrics for PoC.

### Cost

Effectively zero at PoC scale:
- Lambda: free tier covers 1M requests/month
- CloudFront: free tier covers 1TB/month
- S3: negligible for static assets
- OpenRouter: free-tier models = $0 inference
- No data store = no storage cost

## Adversarial Review

### Challenge 1: Free-Tier Validation Cache Staleness
> Chorus Lambda caches free-tier model list on cold start for the invocation lifetime. If a model moves off free-tier mid-demo, Lambda still accepts it, causing cost leakage.

**Disposition: Partially Accepted**
Severity overstated — free-tier models don't flip pricing mid-day, and Lambda invocations are max 300s not hours. However, a short TTL is cheap insurance. Updated design: 60-second in-memory TTL with re-fetch (not per-invocation, which would add latency on every request). Fetch has a 5-second timeout; on failure, returns 503.

### Challenge 2: No Timeout on Models Endpoint Fetch in Chorus Lambda
> If OpenRouter hangs during free-tier validation, Chorus Lambda blocks indefinitely, wasting the 300s timeout and violating NFR-PERF-02.

**Disposition: Accepted**
Valid cascading failure risk. Added explicit 5-second timeout on the free-tier fetch. On timeout or failure, Chorus Lambda returns 503 immediately rather than hanging.

### Challenge 3: No Fallback for Model Catalog Load
> Frontend blocks on model list fetch. Cache miss during demo causes LCP violation.

**Disposition: Partially Accepted**
Hardcoded fallback list and extended cache TTL (5 min → 15 min) accepted — both cheap and effective. Rejected the S3 pre-bake suggestion as over-engineered for a PoC. Frontend renders 3 hardcoded popular free-tier models immediately, fetches full list async in the background.

### Challenge 4: No Input Validation on Prompt or Model ID Array
> Unvalidated prompt/model array sizes enable DoS. FR-SEL-02 max-6 not enforced server-side.

**Disposition: Accepted**
No argument — server-side validation is non-negotiable. Chorus Lambda will reject: prompt > 2,000 chars (400), model_ids count < 2 or > 6 (400), request body > 50 KB (413).

### Challenge 5: No Observability into OpenRouter Rate Limiting
> No logging of OpenRouter rate-limit headers makes operational debugging impossible during rate-limit events.

**Disposition: Accepted**
Zero cost, high value. Added `x-ratelimit-remaining`, `x-ratelimit-reset`, and `retry-after` headers to per-model structured log entries.
