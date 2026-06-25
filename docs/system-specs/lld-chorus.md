# Low-Level Design: Chorus

## References
- HLD: docs/system-specs/hld-chorus.md
- Requirements: docs/system-specs/reqs-chorus.md
- Reference implementation: ~/TechProjects/ModelArena/

---

## 1. API Contract

### 1.1 GET /api/models — Free Model Catalog

**Lambda:** Models Lambda

**Request:**
```
GET /api/models
Headers:
  X-Origin-Verify: <secret>
```

No query parameters. Always returns all free-tier models.

**Response 200:**
```typescript
interface ModelsResponse {
  models: ModelSummary[];
  total: number;
  cached_at: string; // ISO 8601
}

interface ModelSummary {
  id: string;        // e.g. "google/gemma-2-9b-it:free"
  name: string;      // e.g. "Gemma 2 9B IT (free)"
  provider: string;  // e.g. "google" — extracted from id prefix before "/"
}
```

**Response 502:**
```typescript
interface ErrorResponse {
  error: string;   // machine-readable code
  message: string; // human-readable description
}
```

Error codes:
| Status | `error` code | When |
|--------|-------------|------|
| 403 | `origin_verification_failed` | Missing or invalid X-Origin-Verify header |
| 502 | `upstream_unavailable` | OpenRouter /models fetch failed after retries |

**Caching:** CloudFront caches this response for 15 minutes (cache policy TTL). Lambda itself caches the OpenRouter response in-memory for 5 minutes (across warm invocations).

---

### 1.2 POST /api/chorus — Multiplexed Streaming Inference

**Lambda:** Chorus Lambda

**Request:**
```
POST /api/chorus
Content-Type: application/json
Headers:
  X-Origin-Verify: <secret>
```

```typescript
interface ChorusRequest {
  prompt: string;      // 1–2,000 characters
  model_ids: string[]; // 2–6 valid free-tier model IDs
}
```

**Validation rules (server-side, returns 400):**
| Rule | Condition | Error message |
|------|-----------|---------------|
| Empty prompt | `prompt.trim().is_empty()` | `prompt must not be empty` |
| Prompt too long | `prompt.len() > 2000` | `prompt must be 2000 characters or fewer` |
| Too few models | `model_ids.len() < 2` | `select at least 2 models` |
| Too many models | `model_ids.len() > 6` | `select at most 6 models` |
| Invalid model | model ID not in free-tier set | `model not available: <id>` |

**Request body size limit:** 50 KB. Returns 413 if exceeded.

**Response 200 (SSE stream):**
```
Content-Type: text/event-stream
Cache-Control: no-cache
```

**SSE event types:**

```typescript
// Incremental token from one model
interface TokenEvent {
  model_id: string;
  content: string;  // one or more characters/tokens
}

// One model finished streaming successfully
interface ModelDoneEvent {
  model_id: string;
  ttfb_ms: number;      // time to first token (ms)
  duration_ms: number;   // total stream duration (ms)
}

// One model failed (other models continue)
interface ModelErrorEvent {
  model_id: string;
  error: string;         // human-readable error message
  status_code?: number;  // upstream HTTP status if available
}

// All models finished (success or error). Stream ends.
// This is always the last event.
interface DoneEvent {}
```

Wire format:
```
event: token
data: {"model_id":"google/gemma-2-9b-it:free","content":"Hello"}

event: model_done
data: {"model_id":"google/gemma-2-9b-it:free","ttfb_ms":340,"duration_ms":2100}

event: model_error
data: {"model_id":"mistralai/mistral-7b-instruct:free","error":"429 rate limited","status_code":429}

event: done
data: {}
```

Error codes (non-streaming responses):
| Status | `error` code | When |
|--------|-------------|------|
| 400 | `validation_error` | Request fails validation rules |
| 403 | `origin_verification_failed` | Missing or invalid X-Origin-Verify |
| 413 | `payload_too_large` | Request body > 50 KB |
| 503 | `free_tier_unavailable` | Cannot fetch/validate free-tier model list |

---

## 2. Database Schema

None. No persistent data store. All state is ephemeral within a single request lifecycle.

---

## 3. Component Design

### 3.1 Models Lambda — Module Structure

```
backend/models/src/
  main.rs          # Lambda handler, origin verify, response building
  openrouter.rs    # OpenRouterClient — HTTP client for GET /models
  cache.rs         # In-memory model cache with TTL (OnceLock + RwLock)
  filter.rs        # Free-tier filtering logic
  types.rs         # Request/response types, OpenRouter API types
```

**Key types (types.rs):**
```rust
// What OpenRouter returns
pub struct OpenRouterModel {
    pub id: String,
    pub name: String,
    pub pricing: OpenRouterPricing,
}

pub struct OpenRouterPricing {
    pub prompt: String,      // "0" for free
    pub completion: String,  // "0" for free
}

// What we return to frontend
pub struct ModelSummary {
    pub id: String,
    pub name: String,
    pub provider: String,  // extracted from id
}

pub struct ModelsResponse {
    pub models: Vec<ModelSummary>,
    pub total: u32,
    pub cached_at: String,
}
```

**Cache design (cache.rs):**

Same pattern as ModelArena's `cache.rs` — `OnceLock<RwLock<ModelCache>>` with double-checked locking.

```rust
static CACHE: OnceLock<RwLock<ModelCache>> = OnceLock::new();

struct ModelCache {
    models: Vec<OpenRouterModel>,
    fetched_at: Option<Instant>,
    ttl: Duration,  // 5 minutes
}
```

- Read lock → check freshness → return if fresh
- Write lock → double-check → fetch from OpenRouter → update cache
- On fetch failure: serve stale data if available, otherwise error

**Filter logic (filter.rs):**

A model is free-tier if:
- `pricing.prompt == "0"` AND `pricing.completion == "0"`, OR
- Model ID ends with `:free`

Both conditions checked. The `:free` suffix is OpenRouter's convention but pricing fields are the source of truth.

**Provider extraction:**

`provider = model.id.split('/').next()` — e.g., `"google/gemma-2-9b-it:free"` → `"google"`.

---

### 3.2 Chorus Lambda — Module Structure

```
backend/chorus/src/
  main.rs          # Lambda handler, origin verify, validation, SSE response setup
  openrouter.rs    # OpenRouterClient — streaming chat completions
  fanout.rs        # Concurrent fan-out: spawn N Tokio tasks, multiplex into channel
  validation.rs    # Request validation (prompt length, model count, free-tier check)
  free_tier.rs     # Free-tier model ID cache with 60s TTL
  sse.rs           # SSE event serialization (event_to_sse_bytes)
  types.rs         # All type definitions
```

**Key types (types.rs):**
```rust
// Inbound request
pub struct ChorusRequest {
    pub prompt: String,
    pub model_ids: Vec<String>,
}

// SSE events
pub enum SseEvent {
    Token(TokenData),
    ModelDone(ModelDoneData),
    ModelError(ModelErrorData),
    Done,
}

pub struct TokenData {
    pub model_id: String,
    pub content: String,
}

pub struct ModelDoneData {
    pub model_id: String,
    pub ttfb_ms: u64,
    pub duration_ms: u64,
}

pub struct ModelErrorData {
    pub model_id: String,
    pub error: String,
    pub status_code: Option<u16>,
}
```

**Handler flow (main.rs):**

```
1. Verify X-Origin-Verify header → 403 if invalid
2. Check Content-Length ≤ 50KB → 413 if exceeded
3. Parse JSON body → 400 if malformed
4. Validate request (validation.rs) → 400 if invalid
5. Validate model IDs against free-tier cache (free_tier.rs) → 400/503
6. Create mpsc::channel<Bytes>(100)
7. Spawn fanout task (fanout.rs)
8. Return streaming Response with channel as body
```

Same streaming response pattern as ModelArena's orchestrator: `lambda_http::run_with_streaming_response` + `streaming::channel()`.

**Free-tier cache (free_tier.rs):**

Separate from the Models Lambda cache. Chorus Lambda needs its own free-tier validation.

```rust
static FREE_TIER_CACHE: OnceLock<RwLock<FreeTierCache>> = OnceLock::new();

struct FreeTierCache {
    model_ids: HashSet<String>,
    fetched_at: Option<Instant>,
    ttl: Duration,  // 60 seconds (per adversarial review)
}
```

- Fetches OpenRouter GET /models directly (not via Models Lambda)
- 5-second timeout on fetch (per adversarial review)
- On timeout/failure: return 503 (do NOT serve stale data — stale free-tier data is a cost risk)
- Double-checked locking same as Models Lambda cache

**Fan-out logic (fanout.rs):**

```
fn fan_out(
    request: ChorusRequest,
    tx: mpsc::Sender<Bytes>,
    client: Arc<OpenRouterClient>,
) {
    // Spawn one Tokio task per model
    let mut handles = Vec::new();

    for model_id in request.model_ids {
        let tx = tx.clone();
        let client = client.clone();
        let prompt = request.prompt.clone();

        let handle = tokio::spawn(async move {
            stream_model(model_id, prompt, tx, client).await
        });

        handles.push(handle);
    }

    // Wait for all tasks, then send Done event
    join_all(handles).await;
    tx.send(event_to_sse_bytes(&SseEvent::Done)).await.ok();
}
```

**Per-model streaming (openrouter.rs):**

```
async fn stream_model(
    model_id: String,
    prompt: String,
    tx: mpsc::Sender<Bytes>,
    client: Arc<OpenRouterClient>,
) {
    let start = Instant::now();
    let mut first_token_at: Option<Instant> = None;

    // POST to OpenRouter with stream: true
    let response = client.http
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", client.api_key))
        .json(&StreamingChatRequest {
            model: model_id.clone(),
            messages: vec![Message { role: "user", content: prompt }],
            stream: true,
        })
        .timeout(Duration::from_secs(120))
        .send()
        .await;

    // Read SSE chunks from OpenRouter response
    // For each chunk:
    //   - Parse "data: {...}" lines
    //   - Extract delta.content
    //   - Record first_token_at on first non-empty content
    //   - Send TokenEvent through tx
    //   - Log rate-limit headers from initial response

    // On [DONE]:
    //   - Send ModelDoneEvent with ttfb_ms and duration_ms

    // On error:
    //   - Send ModelErrorEvent with error details
    //   - Do NOT propagate — other models continue
}
```

**OpenRouter streaming response parsing:**

OpenRouter uses standard SSE format for streaming chat completions:
```
data: {"id":"...","choices":[{"delta":{"content":"Hello"}}]}
data: {"id":"...","choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

Parse each `data:` line:
- Skip empty lines and `data: [DONE]`
- Deserialize JSON, extract `choices[0].delta.content`
- If content is non-empty, send as TokenEvent

**Rate-limit header capture (per adversarial review):**

On the initial response from OpenRouter (before reading the stream body), capture:
```rust
let ratelimit_remaining = response.headers()
    .get("x-ratelimit-remaining")
    .and_then(|v| v.to_str().ok().and_then(|s| s.parse::<u32>().ok()));

let ratelimit_reset = response.headers()
    .get("x-ratelimit-reset")
    .and_then(|v| v.to_str().ok().map(String::from));

let retry_after = response.headers()
    .get("retry-after")
    .and_then(|v| v.to_str().ok().and_then(|s| s.parse::<u32>().ok()));
```

Log these in the per-model structured log entry.

**SSE serialization (sse.rs):**

Same pattern as ModelArena:
```rust
pub fn event_to_sse_bytes(event: &SseEvent) -> Bytes {
    let (event_name, data_str) = match event {
        SseEvent::Token(d) => ("token", serde_json::to_string(d).unwrap()),
        SseEvent::ModelDone(d) => ("model_done", serde_json::to_string(d).unwrap()),
        SseEvent::ModelError(d) => ("model_error", serde_json::to_string(d).unwrap()),
        SseEvent::Done => ("done", "{}".to_string()),
    };
    Bytes::from(format!("event: {event_name}\ndata: {data_str}\n\n"))
}
```

---

### 3.3 Frontend SPA — Module Structure

```
frontend/src/
  main.tsx                    # React entry point
  App.tsx                     # Router, theme provider
  theme.ts                    # MUI theme customization
  types/
    models.ts                 # ModelSummary, ModelsResponse
    chorus.ts                 # ChorusRequest, SSE event types, panel state
  api/
    models.ts                 # fetchModels() — GET /api/models
    chorus.ts                 # streamChorus() — POST /api/chorus, SSE parser
  components/
    AppBar.tsx                # Top bar with title
    ModelSelector.tsx         # Checkbox list of available models
    PromptInput.tsx           # Text field + submit button + character counter
    ResponseGrid.tsx          # Responsive grid of ResponsePanels
    ResponsePanel.tsx         # Single model's streaming response
    MarkdownRenderer.tsx      # Markdown-to-React renderer
  pages/
    ChorusPage.tsx            # Main page — composes all components
  hooks/
    useChorus.ts              # Core state management hook
```

**Frontend types (types/chorus.ts):**
```typescript
interface ChorusRequest {
  prompt: string;
  model_ids: string[];
}

type PanelStatus = "idle" | "streaming" | "done" | "error";

interface PanelState {
  model_id: string;
  model_name: string;
  status: PanelStatus;
  content: string;       // accumulated markdown content
  error?: string;
  ttfb_ms?: number;
  duration_ms?: number;
}

// SSE event discriminated union
type SseEvent =
  | { type: "token"; model_id: string; content: string }
  | { type: "model_done"; model_id: string; ttfb_ms: number; duration_ms: number }
  | { type: "model_error"; model_id: string; error: string; status_code?: number }
  | { type: "done" };
```

**Fallback models (api/models.ts):**
```typescript
const FALLBACK_MODELS: ModelSummary[] = [
  { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B IT (free)", provider: "google" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B Instruct (free)", provider: "meta-llama" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B Instruct (free)", provider: "mistralai" },
];
```

Frontend renders these immediately, then replaces with full list when GET /api/models resolves.

**SSE client (api/chorus.ts):**

Uses `fetch` with streaming body reader (not EventSource, because EventSource only supports GET):

```typescript
async function streamChorus(
  request: ChorusRequest,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  const response = await fetch("/api/chorus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse complete SSE events from buffer
    const events = buffer.split("\n\n");
    buffer = events.pop()!; // keep incomplete event in buffer

    for (const raw of events) {
      if (!raw.trim()) continue;
      const eventType = raw.match(/^event: (.+)$/m)?.[1];
      const data = raw.match(/^data: (.+)$/m)?.[1];
      if (eventType && data) {
        onEvent({ type: eventType, ...JSON.parse(data) } as SseEvent);
      }
    }
  }
}
```

**State management hook (hooks/useChorus.ts):**

```typescript
function useChorus() {
  const [panels, setPanels] = useState<Map<string, PanelState>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);

  async function submit(prompt: string, modelIds: string[], modelNames: Map<string, string>) {
    // Initialize panels to "streaming" state
    // Call streamChorus with onEvent callback
    // onEvent routes events to correct panel:
    //   "token" → append content to panel
    //   "model_done" → set panel status to "done"
    //   "model_error" → set panel status to "error"
    //   "done" → set isStreaming to false
  }

  return { panels, isStreaming, submit };
}
```

Key detail: `setPanels` uses functional updates to avoid stale closures. Each `onEvent` call does `setPanels(prev => new Map(prev).set(modelId, updatedPanel))`.

**Responsive grid (components/ResponseGrid.tsx):**

MUI Grid2 with responsive breakpoints:
```typescript
// 2 models → 2 columns
// 3 models → 3 columns on lg, 2 on md, 1 on sm
// 4+ models → wrapping grid, min panel width ~350px

<Grid2 container spacing={2}>
  {panels.map(panel => (
    <Grid2 key={panel.model_id} size={{ xs: 12, sm: 6, md: 6, lg: columnSize }}>
      <ResponsePanel panel={panel} />
    </Grid2>
  ))}
</Grid2>
```

Where `columnSize = Math.max(3, Math.floor(12 / panelCount))` (MUI 12-column grid).

**Markdown rendering (components/MarkdownRenderer.tsx):**

Use `react-markdown` with `remark-gfm` for GitHub-flavored markdown. Use `react-syntax-highlighter` for code blocks.

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    code({ className, children }) {
      const language = className?.replace("language-", "");
      return language ? (
        <SyntaxHighlighter language={language}>{children}</SyntaxHighlighter>
      ) : (
        <code>{children}</code>
      );
    },
  }}
>
  {content}
</ReactMarkdown>
```

**ResponsePanel states:**

| Status | Visual |
|--------|--------|
| `idle` | Empty panel with model name header |
| `streaming` | Pulsing cursor after last character, markdown rendering incrementally |
| `done` | Cursor removed, optional copy button appears, ttfb/duration shown subtly |
| `error` | Red error message in panel body, other panels unaffected |

---

### 3.4 CDK Infrastructure — ChorusStack

Follow ModelArena's `model-arena-stack.ts` exactly, adapted for Chorus:

```
infra/
  bin/app.ts               # CDK app entry
  lib/chorus-stack.ts      # Single stack
  lib/utils/waf-util.ts    # WAF ACL helper (copy from ModelArena)
  package.json
  tsconfig.json
  cdk.json
```

**ChorusStack components:**

1. **Models Lambda** — `PROVIDED_AL2023`, ARM64, 256MB, 30s timeout, Function URL (GET only)
2. **Chorus Lambda** — `PROVIDED_AL2023`, ARM64, 1024MB, 300s timeout, Function URL with `RESPONSE_STREAM` invoke mode (POST only)
3. **S3 bucket** — frontend assets, `BLOCK_ALL` public access
4. **CloudFront distribution** — 3 behaviors:
   - `/*` → S3 origin (frontend, `CACHING_OPTIMIZED`)
   - `/api/models*` → Models Lambda Function URL origin (15-min cache)
   - `/api/chorus*` → Chorus Lambda Function URL origin (no cache)
5. **Origin-verify secret** — `crypto.randomUUID()`, injected as custom header on origins, checked by Lambdas
6. **WAF ACL** — AWS managed rules, same as ModelArena
7. **Security response headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
8. **S3 deployment** — deploys `frontend/dist` to bucket with CloudFront invalidation

**Environment variables for both Lambdas:**
```
OPENROUTER_API_KEY     — from process.env (loaded from .env at deploy time)
CLOUDFRONT_ORIGIN_VERIFY — generated secret
RUST_LOG               — "info"
```

---

## 4. Algorithm Details

### 4.1 Concurrent Fan-Out with Multiplexed SSE

```
INPUT: prompt (string), model_ids (Vec<String>)
OUTPUT: multiplexed SSE stream

1. Create mpsc::channel<Bytes> with capacity 100
2. For each model_id in model_ids:
   a. Clone tx, client, prompt
   b. Spawn Tokio task:
      i.   Record start_time = Instant::now()
      ii.  POST to OpenRouter /chat/completions with stream: true
      iii. If HTTP error → send ModelError event → return
      iv.  Capture rate-limit headers from response
      v.   Read response body as byte stream
      vi.  For each SSE "data:" line from OpenRouter:
           - If "[DONE]" → send ModelDone event with timing → return
           - Parse JSON, extract choices[0].delta.content
           - If first non-empty content → record ttfb
           - Send Token event with model_id + content
      vii. If stream error → send ModelError event → return
3. join_all(handles)
4. Send Done event
5. Drop tx → receiver sees channel closed → response stream ends

Time complexity: O(total_tokens_across_all_models) — each token is processed once
Space complexity: O(channel_capacity * avg_event_size) — bounded by mpsc buffer
```

### 4.2 Free-Tier Filtering

```
INPUT: Vec<OpenRouterModel> from OpenRouter /models
OUTPUT: Vec<ModelSummary> of free-tier models only

For each model in input:
  1. is_free = (pricing.prompt == "0" AND pricing.completion == "0")
              OR model.id ends with ":free"
  2. If is_free:
     a. Extract provider from id (text before first "/")
     b. Create ModelSummary { id, name, provider }
     c. Add to output

Sort output alphabetically by name.
```

### 4.3 SSE Client-Side Parsing

```
INPUT: ReadableStream from fetch response
OUTPUT: sequence of typed SseEvent objects

1. Initialize buffer = ""
2. While stream has data:
   a. Read chunk, decode as UTF-8, append to buffer
   b. Split buffer on "\n\n" (SSE event delimiter)
   c. Last segment stays in buffer (may be incomplete)
   d. For each complete segment:
      i.   Extract event type from "event: <type>" line
      ii.  Extract data from "data: <json>" line
      iii. Parse JSON, merge with type → SseEvent
      iv.  Call onEvent callback
3. Stream ends → processing complete
```

---

## 5. Error Handling & Resilience

### 5.1 Models Lambda

| Failure | Behavior | Recovery |
|---------|----------|----------|
| OpenRouter /models returns non-200 | Retry 3x with exponential backoff (500ms, 1s, 2s) | Serve stale cache if available; otherwise 502 |
| OpenRouter /models times out (>10s) | Treat as failure | Same as above |
| OpenRouter returns unparseable JSON | Log error, treat as failure | Same as above |
| Missing OPENROUTER_API_KEY env var | Return 500 immediately | Deploy-time fix |

### 5.2 Chorus Lambda

| Failure | Behavior | Recovery |
|---------|----------|----------|
| Free-tier fetch timeout (>5s) | Return 503 | No stale fallback (cost safety) |
| Single model returns HTTP error | Send ModelError SSE event for that model | Other models continue |
| Single model stream stalls (>120s) | reqwest timeout fires | Send ModelError, other models continue |
| Single model returns unparseable SSE | Log warning, skip malformed chunk | Continue reading stream |
| OpenRouter rate limits (429) | Send ModelError with status_code 429 | No retry for streaming (complexity too high for PoC) |
| All models fail | Each sends ModelError, then Done event | Frontend shows errors in all panels |
| Client disconnects mid-stream | tx.send() returns Err | Tokio tasks detect closed channel, stop cleanly |
| Request body unparseable | Return 400 before streaming starts | Client retries |

### 5.3 Frontend

| Failure | Behavior | Recovery |
|---------|----------|----------|
| GET /api/models fails | Show fallback models (3 hardcoded) | Retry after 30s in background |
| POST /api/chorus fails (non-200) | Show error message above panels | User can retry |
| SSE stream disconnects mid-stream | Panels freeze at last received content | Show "connection lost" in affected panels |
| Malformed SSE event | Skip the event, log to console | Continue processing subsequent events |

---

## 6. Test Plan

### 6.1 Models Lambda — Unit Tests

| Test | Verifies |
|------|----------|
| `test_filter_free_models_by_pricing` | Models with prompt="0" and completion="0" pass filter |
| `test_filter_free_models_by_suffix` | Models ending in `:free` pass filter |
| `test_filter_excludes_paid_models` | Models with non-zero pricing are excluded |
| `test_provider_extraction` | `"google/gemma-2-9b-it:free"` → provider `"google"` |
| `test_provider_extraction_no_slash` | Model ID without `/` → provider `"unknown"` |
| `test_origin_verify_rejects_missing` | Request without header → 403 |
| `test_origin_verify_rejects_wrong` | Request with wrong header → 403 |
| `test_origin_verify_accepts_correct` | Request with correct header → passes |
| `test_cache_returns_fresh_data` | Second call within TTL returns cached data (no HTTP call) |
| `test_cache_refetches_after_ttl` | Call after TTL expiry triggers new fetch |
| `test_cache_serves_stale_on_error` | Fetch failure returns stale cached models |

### 6.2 Chorus Lambda — Unit Tests

| Test | Verifies |
|------|----------|
| `test_validate_empty_prompt` | Empty/whitespace prompt → error |
| `test_validate_prompt_too_long` | 2001-char prompt → error |
| `test_validate_prompt_at_limit` | 2000-char prompt → ok |
| `test_validate_too_few_models` | 1 model → error |
| `test_validate_too_many_models` | 7 models → error |
| `test_validate_bounds` | 2 and 6 models → ok |
| `test_validate_invalid_model_id` | Model not in free-tier set → error |
| `test_sse_token_event_format` | TokenEvent serializes to correct SSE wire format |
| `test_sse_done_event_format` | DoneEvent serializes to `event: done\ndata: {}\n\n` |
| `test_free_tier_cache_ttl` | Cache expires after 60s, triggers refetch |
| `test_free_tier_cache_rejects_stale` | Stale free-tier cache returns 503 (no stale fallback) |

### 6.3 Chorus Lambda — Integration Tests

| Test | Verifies |
|------|----------|
| `test_full_stream_two_models` | End-to-end: submit prompt with 2 models, receive token events for both, then model_done for both, then done |
| `test_partial_failure` | One model returns 429, other succeeds. Verify: model_error for failing model, token + model_done for succeeding model, done at end |
| `test_body_size_limit` | 51KB request body → 413 |
| `test_origin_verify` | Missing header → 403 |

### 6.4 Frontend — Component Tests

| Test | Verifies |
|------|----------|
| `ModelSelector renders models` | Displays model list with checkboxes |
| `ModelSelector enforces min/max` | Submit disabled with < 2 selected; 7th selection blocked |
| `PromptInput character limit` | Counter shows remaining chars; warns at limit |
| `PromptInput blocks empty submit` | Submit button disabled when empty |
| `ResponsePanel streaming state` | Shows loading indicator, then streaming content |
| `ResponsePanel error state` | Shows error message in red |
| `ResponsePanel done state` | Shows copy button, timing info |
| `ResponseGrid responsive layout` | 2 panels → 2 columns; 4 panels → grid wraps |

### 6.5 Load Test Targets

Not applicable for PoC. If needed later:
- Target: 10 concurrent users (10 simultaneous Chorus Lambda invocations)
- p99 time-to-first-token overhead (excluding model latency): < 500ms
- Models Lambda: 50 req/s (most served from CloudFront cache)

---

## 7. Cargo Dependencies

### 7.1 Models Lambda — Cargo.toml

```toml
[package]
name = "models-lambda"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "models"
path = "src/main.rs"

[dependencies]
lambda_http = "0.13"
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["json", "env-filter"] }
chrono = { version = "0.4", features = ["serde"] }
```

### 7.2 Chorus Lambda — Cargo.toml

```toml
[package]
name = "chorus-lambda"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "chorus"
path = "src/main.rs"

[dependencies]
lambda_runtime = "0.13"
lambda_http = "0.13"
tokio = { version = "1", features = ["full"] }
tokio-util = "0.7"
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls", "stream"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
futures = "0.3"
bytes = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["json", "env-filter"] }
```

Note: `reqwest` has `stream` feature enabled — needed for reading OpenRouter's SSE response as a byte stream.

### 7.3 Frontend — package.json dependencies

```json
{
  "dependencies": {
    "@mui/material": "^7",
    "@emotion/react": "^11",
    "@emotion/styled": "^11",
    "react": "^19",
    "react-dom": "^19",
    "react-markdown": "^9",
    "remark-gfm": "^4",
    "react-syntax-highlighter": "^15"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5",
    "vite": "^6"
  }
}
```
