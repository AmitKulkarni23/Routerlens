# Adversarial Review: LLD Chorus

Reviewed: 2026-06-24
Source: docs/system-specs/lld-chorus.md

## Challenges

### 1. SSE Channel Capacity Bottleneck Under Concurrent Load — Severity: High

**Problem:** Fan-out spawns N Tokio tasks that all write to a single `mpsc::channel<Bytes>(100)`, with no backpressure handling or overflow semantics specified.

**Why it matters:** The channel buffer capacity of 100 is fixed regardless of model count (2–6). When multiple models generate tokens rapidly, the channel can fill. If a slow consumer (browser) can't keep pace with the fastest model's output, tokens will queue in the channel. Once full, `tx.send()` blocks or fails, stalling the streaming response. No strategy is specified for which tokens to drop or how to signal to the frontend that it's behind. Under NFR-PERF-02 (first token < 3s), a stalled channel violates the user-perceived latency goal.

**Suggested alternative:** Replace fixed capacity `mpsc::channel<Bytes>(100)` with a bounded channel of capacity `max_models * avg_tokens_per_model_per_second`. Calculate this as `6 * 10 = 60` tokens/sec for 6 models × 2–3 seconds of buffering = capacity 120–180. If the channel fills, implement backpressure: pause reading from the slowest model's stream (via `cancel_on_drop`) rather than blocking the entire fan-out. Log dropped events as "backpressure applied" for observability. This keeps the critical-path SSE delivery latency from degrading under bursty output.

---

### 2. Free-Tier Cache Invalidation Race Condition — Severity: High

**Problem:** The Chorus Lambda `free_tier.rs` module fetches the free-tier model list on expiry (60s TTL) with double-checked locking, but the fetch happens synchronously inside the write lock, blocking all concurrent requests.

**Why it matters:** If multiple requests arrive exactly when the TTL expires, the first request acquires the write lock and blocks the fetch (5-second timeout). All other concurrent requests block on the lock until the fetch completes or times out. If the fetch times out, all blocked requests return 503. This violates availability — a single timeout can take down traffic to all 6+ concurrent sessions. Worse, if 60 seconds is chosen to avoid stale cost-risky data, but the fetch is synchronous and blocks on timeout, you've traded correctness risk for availability risk.

**Suggested alternative:** Use a separate async task to refresh the free-tier cache in the background (Tokio `tokio::spawn`). The main request handler checks the cache freshness in a read lock. If stale, it:
1. Spawns a background refresh task (non-blocking) if one isn't already running
2. Returns the stale data (if available) or 503 (if cache is empty) to avoid the blocking fetch
This way, a fetch timeout only delays the *next* cache refresh, not the current request. Maintain a "last_refresh_attempt" timestamp to debounce refresh spam.

---

### 3. OpenRouter SSE Parsing Does Not Handle Partial UTF-8 Sequences — Severity: Medium

**Problem:** The `stream_model` function reads OpenRouter's byte stream and deserializes JSON per "data:" line, but the code does not explicitly handle multi-byte UTF-8 sequences that may split across chunk boundaries.

**Why it matters:** reqwest's streaming response reader chunks data at network packet boundaries, not UTF-8 boundaries. A multi-byte UTF-8 character (e.g., emoji) can be split: first 2 bytes in one chunk, last byte in the next. If the JSON deserializer receives incomplete UTF-8, it will either silently drop the byte or panic, corrupting the stream. The frontend will see garbled content or dropped tokens. Given the test plan (section 6.3) lacks tests for UTF-8 boundary conditions, this bug is likely to ship.

**Suggested alternative:** Use `tokio::codec::LinesCodec` or `BufReader` to buffer the byte stream until a complete line (ending in `\n`) is available, ensuring UTF-8 decoding happens on complete sequences. Then deserialize the complete JSON line. Alternatively, use `futures-util::io::AsyncBufReadExt` + `read_line()` for line-buffered reading.

---

### 4. No Timeout or Cancellation on Client Disconnect — Severity: Medium

**Problem:** When the client disconnects mid-stream (closes the browser or loses network), the Tokio tasks spawned in `fan_out()` continue running until either (a) the model finishes streaming, (b) the 120-second timeout fires, or (c) the Lambda timeout (300s) is hit.

**Why it matters:** If a client submits a request, then closes the tab before the first model finishes, the Chorus Lambda invocation continues for up to 300 seconds, consuming compute time and hitting OpenRouter unnecessarily. With free-tier models, latency can be 10–30 seconds per model, so a typical session uses 20–40s. Abandoning an invocation and letting it run to completion wastes 260–280 seconds per abandoned request. At scale (100+ concurrent sessions), this is significant cost and resource waste. NFR-SEC-02 assumes the system can be cost-gamed if free-tier validation is stale; here, it's actively wasting compute time.

**Suggested alternative:** Wrap the response stream (the Lambda's return value) with a `Drop` guard that signals cancellation to all Tokio tasks. On HTTP 200, return `impl Stream` that owns `CancellationToken` handles for each task. When the HTTP response stream is dropped (client disconnects), the token is cancelled, and all tasks receive `Err(Cancelled)` and exit cleanly. Use `tokio::select!` with a cancellation branch in `stream_model()`.

---

### 5. No Request Deduplication or Idempotency Semantics — Severity: Medium

**Problem:** The POST /api/chorus endpoint is stateless and has no request ID or idempotency key. If a client retries the same request (network flake, browser retry), the backend fans out again, sending duplicate requests to OpenRouter.

**Why it matters:** A user submits a prompt with 3 models, gets a network timeout at 2 seconds, retries. The backend fans out again to 3 models, totaling 6 redundant OpenRouter requests. On free-tier models this is a minor issue (zero cost), but operationally, it inflates request counts, making load analysis and rate-limit monitoring harder. More critically, if the free-tier policy ever changes to include a true rate limit (e.g., 100 reqs/min per IP), duplicates could cause legitimate retries to be rejected. Additionally, if frontend is instrumented with retry logic (e.g., exponential backoff on 5xx), duplicate fan-outs compound the problem.

**Suggested alternative:** Accept an optional `X-Idempotency-Key` header (UUIDv4 or client-provided nonce) in the request. Cache the response (shallow copy of SSE events to a file or in-memory buffer keyed by idempotency key) with a 5-minute TTL. On duplicate request, replay the cached SSE stream instead of fanning out again. This is standard for POST idempotency but adds complexity; for a PoC, document in the LLD that duplicates are acceptable, OR implement a simpler version: log request fingerprint (hash of prompt + model_ids) and emit a warning if the same fingerprint appears within 10 seconds.

---
