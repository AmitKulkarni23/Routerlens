# Adversarial Review: HLD Chorus

Reviewed: 2026-06-24
Source: `/Users/amitrk/TechProjects/Chorus/docs/system-specs/hld-chorus.md`

## Challenges

### 1. Free-Tier Validation Cache Staleness — Severity: Critical

**Problem:** Chorus Lambda caches the free-tier model list on cold start and reuses it for the invocation lifetime, creating a staleness window where OpenRouter has marked a model as paid but Lambda still accepts it.

**Why it matters:** Direct cost leakage. If a previously-free model moves off free-tier mid-demo (e.g., OpenRouter changes pricing), the warm Chorus Lambda (which can run for hours) will still accept requests for that model and charge the account for expensive inference. This violates NFR-SEC-02 (backend must validate free-tier status) and creates uncontrolled cost exposure during a demo or traffic event.

**Suggested alternative:** Replace the cold-start + lifetime cache with a per-invocation fetch + 30-second TTL. Before accepting any model ID in Chorus Lambda, fetch the current free-tier list with a 30-second in-memory TTL (using `OnceCell<(Instant, HashSet<String>)>` so all Tokio tasks in one invocation share the result). If cache expires, fetch fresh. Cost is ~10ms per invocation; benefit eliminates the staleness gap.

---

### 2. No Timeout on Models Endpoint Fetch in Chorus Lambda — Severity: High

**Problem:** Chorus Lambda (section 2.2) validates free-tier IDs by fetching the model catalog, but the design does not specify a timeout on this fetch. If OpenRouter API hangs or the Models Lambda stalls, Chorus Lambda blocks indefinitely.

**Why it matters:** Cascading failure. A slow OpenRouter API stalls the critical path for user requests, wasting the 300-second Lambda timeout and increasing latency. Also violates NFR-PERF-02 (first token < 3s)—if validation takes 60 seconds, the budget is exhausted before fan-out starts. Lambda billing increases and cold-start overhead grows.

**Suggested alternative:** Add an explicit timeout on the free-tier fetch (5 seconds recommended). If it exceeds this, return 503 "Unable to validate models" rather than hanging. Alternatively, decouple: on Models Lambda cold start, push the free-tier list to S3 with a 10-minute TTL, and Chorus Lambda reads from S3 with a live-fetch fallback only on miss. This removes the blocking dependency on OpenRouter during each Chorus invocation.

---

### 3. No Fallback for Model Catalog Load — Severity: High

**Problem:** Frontend calls GET /api/models on page load to populate the model selector. Design relies on CloudFront 5-minute cache, but on cache miss (e.g., at midnight UTC, or during a demo with many visitors), if the Models Lambda or OpenRouter stalls, the frontend blocks and cannot render.

**Why it matters:** Violates NFR-PERF-01 (LCP < 2s). If the model list fetch times out or stalls, the page is stuck—user sees a blank selector and cannot proceed. During a high-traffic event or demo, many simultaneous requests to OpenRouter from the Models Lambda can trigger rate limits or timeouts, cascading into a broken UI for all users.

**Suggested alternative:** (1) Models Lambda retries with exponential backoff (3 attempts, 500ms initial) with a 10-second timeout on OpenRouter. (2) Extend CloudFront cache to 15 minutes (free-tier catalog is stable). (3) Frontend renders a hardcoded fallback list of 3–4 popular free-tier models (e.g., Gemma 2, Llama 3) in parallel, unblocking page load while the true list fetches asynchronously. Worst case, user gets a partial model list but the page is interactive. (4) Consider pre-baking the free-tier list into the Models Lambda at deploy time if models are stable enough.

---

### 4. No Input Validation on Prompt or Model ID Array — Severity: Medium

**Problem:** Chorus Lambda API (section 4) accepts `prompt` (up to 2,000 chars per FR-PROMPT-01) and `model_ids` array, but the design does not specify server-side validation of size, count, or format. A client could submit a 10MB prompt or 50-item model array.

**Why it matters:** DoS vector. An oversized request can exhaust Chorus Lambda memory (1024 MB allocated) or trigger unexpected behavior. Also violates implicit bounds on fan-out—FR-SEL-02 mandates max 6 models, but the API does not enforce this server-side, relying entirely on frontend validation.

**Suggested alternative:** Add server-side validation in Chorus Lambda request handler: (1) Reject if `prompt.len() > 2000` with 400 error. (2) Reject if `model_ids.len() < 2 || model_ids.len() > 6` with 400 error. (3) Reject if request body > 50 KB with 413 error. These are < 10 lines of Rust and provide defense-in-depth against client-side bypass or malformed requests.

---

### 5. No Observability into OpenRouter Rate Limiting or Quota Status — Severity: Medium

**Problem:** Design logs per-model latency and success/failure (NFR-OBS-01), but does not capture OpenRouter rate-limit headers (`x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after`) in structured logs.

**Why it matters:** Operational blindness. During a demo or traffic spike, if the backend hits rate limits, the operator sees "429 rate limited" error logs but cannot determine root cause: per-user rate limit, per-IP block, free-tier quota exhaustion, or global throttling. Without this data, debugging takes much longer and may point to the wrong culprit.

**Suggested alternative:** Capture OpenRouter rate-limit headers in per-model log entries. Example structured log:
```json
{
  "model_id": "google/gemma-2-9b-it:free",
  "status": "429",
  "openrouter_ratelimit_remaining": 10,
  "openrouter_ratelimit_reset": "2026-06-24T14:30:00Z",
  "openrouter_retry_after": 30
}
```
Cost is zero (headers already in response); benefit is immediate debuggability.

---
