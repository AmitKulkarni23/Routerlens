# Task 05 — OpenRouter Client and Call Outcome Capture

## Summary

Implement the `openrouter` crate: makes one pinned `chat/completions` call
per `WorkItem` to OpenRouter, with the provider forced via
`provider.order = [name]` and `allow_fallbacks = false`, and captures the
result — success or failure — as a `CallOutcome` struct. Per architecture
spec, transport/HTTP/rate-limit failures are recorded as data, not retried
in a loop; exactly one bounded retry is permitted, and only for rate-limit
responses.

## Read First

- `docs/system-specs/architecture.md` §3 (Probe configuration) — the pinning
  request shape: `"provider": {"order": ["<name>"], "allow_fallbacks": false}`,
  model `meta-llama/llama-3.3-70b-instruct`.
- `docs/system-specs/architecture.md` §4 (Pipeline) — `CallOutcome { call_ok, raw_response, finish_reason, latency_ms, cost_usd, error_kind }`
  and the failure semantics: transport/HTTP/rate-limit errors are data, not
  a retry loop; exactly one bounded retry with backoff for rate-limit
  responses only; everything else records the first outcome.
- `docs/system-specs/architecture.md` §11 — no live-OpenRouter integration
  test in CI (cost + rate limit); the crate must be exercisable in a stub
  mode for Task 08's `--dry-run`.

## Requirements

### Request construction and pinning

- The crate MUST expose `pub struct OpenRouterClient` constructed via
  `OpenRouterClient::new(api_key: String, base_url: String) -> Self` (base
  URL injectable so tests/dry-run can point at a mock server instead of
  `https://openrouter.ai/api/v1`).
- The crate MUST expose `pub async fn call(&self, work_item: &fanout::WorkItem, system_prompt: &str, max_tokens: u32) -> CallOutcome`
  that never returns `Result::Err` to the caller — all failure modes are
  represented inside `CallOutcome`.
- The request body MUST set `model: "meta-llama/llama-3.3-70b-instruct"`,
  `messages` with the bank's `system_prompt` and the work item's `prompt`,
  `max_tokens`, `stream: false`, and
  `provider: { order: [work_item.provider], allow_fallbacks: false }`.
- The HTTP client MUST use `reqwest` with `rustls-tls` (no native-tls) and
  MUST set a request timeout (e.g. 30s, documented as a named constant).

### CallOutcome and error taxonomy

- `pub struct CallOutcome { pub call_ok: bool, pub raw_response: Option<String>, pub finish_reason: Option<String>, pub latency_ms: i64, pub cost_usd: Option<f64>, pub error_kind: Option<ErrorKind> }`.
- `pub enum ErrorKind { Timeout, Http4xx, Http5xx, RateLimited, MalformedResponse }` — these are the only five variants, matching the `calls.error_kind` values documented in architecture.md §7 and validated by the Task 02 schema.
- On success (2xx with a parseable completion body), `call_ok` MUST be
  `true`, `error_kind` MUST be `None`, and `raw_response` MUST contain the
  assistant's message content.
- On request timeout, `error_kind` MUST be `Some(ErrorKind::Timeout)` and
  `call_ok` MUST be `false`.
- On HTTP 429, the client MUST retry exactly once after a fixed backoff
  (e.g. 2s, named constant) before giving up; if the retry also fails,
  `error_kind` MUST be `Some(ErrorKind::RateLimited)`. Non-429 errors MUST
  NOT be retried.
- On HTTP 4xx (excluding 429) the outcome MUST be `Some(ErrorKind::Http4xx)`;
  on HTTP 5xx, `Some(ErrorKind::Http5xx)`.
- On a 2xx response whose body cannot be parsed into the expected
  completion shape (missing `choices`, malformed JSON), the outcome MUST be
  `Some(ErrorKind::MalformedResponse)`.
- `latency_ms` MUST be measured wall-clock from just before the request is
  sent to just after the (retried, if applicable) response is received,
  and MUST be populated on every outcome, success or failure.
- `cost_usd` MUST be populated from the OpenRouter response's cost/usage
  field when present on success; `None` when absent or on failure.

## TDD Plan

N/A — the OpenRouter client is network I/O glue (HTTP request/response
handling, retry timing), not one of the four categories (grading, fan-out,
calibration filtering, incident detection) the project testing policy
(architecture.md §11) scopes unit tests to. Correctness is verified via
Task 08's `--dry-run` mode (stubbed responses exercise the full outcome
mapping without real network calls) and, once deployed, by observing real
`calls` rows in Postgres.

## Dependencies

Task 01 (repo scaffolding), Task 04 (fanout crate — provides `WorkItem`).

## Files to Create/Modify

- `prober/crates/openrouter/src/lib.rs` (modify — implement `OpenRouterClient`, `CallOutcome`, `ErrorKind`, `call`)
- `prober/crates/openrouter/Cargo.toml` (modify — add `fanout` path dependency, `reqwest` with `rustls-tls`, `tokio`, `serde`, `serde_json`)

## Acceptance Criteria

- All RED tests written and failing for the right reason: N/A, no tests in this task.
- All tests GREEN with minimal implementation: N/A.
- REFACTOR pass complete, no regressions: N/A.
- Request body sent by `call` matches the pinning shape from
  architecture.md §3 exactly (verified by manual inspection or by pointing
  `base_url` at a local echo server during development, not committed as a
  test).
- All five `ErrorKind` variants are reachable and correctly mapped from
  their triggering condition, verified via Task 08's `--dry-run` stub
  coverage.
- 429 responses trigger exactly one retry, never more.
- `cargo build -p openrouter` compiles with no warnings.

## Spec Updates

None.
