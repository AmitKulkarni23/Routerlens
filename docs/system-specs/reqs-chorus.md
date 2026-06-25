# Requirements: Chorus

## References
- Product definition: CLAUDE.md

## Actors

1. **Visitor** — anonymous user arriving via shared link. Types a prompt, selects models, reads streamed responses side by side.
2. **System** — backend infrastructure that proxies requests to OpenRouter and streams responses back.

## Functional Requirements

### Model Discovery (DISC)

FR-DISC-01: Visitor MUST be able to see a list of available free-tier models
  from OpenRouter so that they can choose which models to compare.
  Acceptance: Page loads and displays model list; every model shown has
  zero-cost pricing on OpenRouter.

FR-DISC-02: System MUST filter the OpenRouter model catalog to only free-tier
  models so that no paid inference is triggered.
  Acceptance: No model with non-zero pricing appears in the selection UI
  or is callable via the API.

FR-DISC-03: Visitor MUST see each model's provider name and model name so that
  they can make informed selections.
  Acceptance: Each model entry displays provider (e.g., "Google") and model
  name (e.g., "Gemma 2 9B").

### Model Selection (SEL)

FR-SEL-01: Visitor MUST be able to select 2 or more models for comparison so
  that they can configure a side-by-side view.
  Acceptance: User can check/select multiple models; submit is enabled only
  when >= 2 are selected.

FR-SEL-02: System MUST enforce a maximum of 6 simultaneous models so that the
  UI remains usable and backend fan-out stays bounded.
  Acceptance: Selecting a 7th model is prevented with a clear message.

FR-SEL-03: Visitor SHOULD be able to see a sensible default selection of models
  (e.g., 3 popular free models pre-selected) so that they can start quickly
  without browsing the full catalog.
  Acceptance: On first load, 2-3 models are pre-selected; user can override.

### Prompt Input (PROMPT)

FR-PROMPT-01: Visitor MUST be able to type a free-text prompt (up to 2,000
  characters) so that they can send a question to all selected models.
  Acceptance: Text input accepts up to 2,000 chars; exceeding the limit
  shows a character count warning.

FR-PROMPT-02: Visitor MUST be able to submit the prompt with a single action
  (button click or Enter key) so that all selected models receive the same
  prompt simultaneously.
  Acceptance: One click/keypress triggers fan-out to all selected models.

FR-PROMPT-03: System MUST prevent submission of an empty prompt so that no
  wasted API calls are made.
  Acceptance: Submit is disabled when prompt is blank or whitespace-only.

### Streaming Responses (STREAM)

FR-STREAM-01: System MUST fan out the submitted prompt to all selected models
  concurrently via OpenRouter's chat completions endpoint with stream: true
  so that responses begin arriving as soon as each model starts generating.
  Acceptance: All models receive the request within 500ms of each other;
  SSE tokens arrive in the UI as they are generated.

FR-STREAM-02: Visitor MUST see each model's response streaming in its own panel,
  side by side, so that they can visually compare outputs in real time.
  Acceptance: Each selected model has a dedicated column/panel; tokens appear
  incrementally.

FR-STREAM-03: System MUST display a per-model loading state until the first
  token arrives so that the visitor knows the request is in progress.
  Acceptance: Loading indicator visible between submit and first token;
  disappears on first token.

FR-STREAM-04: System MUST handle per-model failures independently so that one
  model's error does not block or crash other models' streams.
  Acceptance: If model A returns a 429/500/timeout, model A's panel shows an
  error message while models B and C continue streaming normally.

FR-STREAM-05: Visitor MUST see a clear done state per model when streaming
  completes so that they know the full response has been received.
  Acceptance: Visual indicator appears when the stream's [DONE] event fires.

### Response Display (DISP)

FR-DISP-01: System MUST render model responses as formatted markdown (headings,
  lists, code blocks, inline code) so that responses are readable.
  Acceptance: Markdown elements render correctly; raw markdown syntax not shown.

FR-DISP-02: Visitor MAY be able to copy a single model's response to clipboard
  so that they can use it elsewhere.
  Acceptance: Copy button on each panel copies the full response text.

### Layout (LAYOUT)

FR-LAYOUT-01: System MUST arrange response panels in a responsive grid that
  adapts to viewport width so that the demo works on desktop and tablet.
  Acceptance: 2 models = 2 columns; 3+ models = grid wraps sensibly;
  minimum panel width ~350px.

FR-LAYOUT-02: System MUST display the model name as a header on each response
  panel so that the visitor always knows which model produced which response.
  Acceptance: Model name visible at top of each panel, persists during scroll.

## Non-Functional Requirements

### Performance

NFR-PERF-01: Initial page load (LCP) MUST complete within 2 seconds on a 4G
  connection so that recruiter-audience link clicks don't bounce.
  Rationale: Primary audience clicks a portfolio link — slow load kills
  the impression.

NFR-PERF-02: Time from prompt submission to first visible token in any panel
  MUST be under 3 seconds (excluding model inference latency) so that the
  system feels responsive.
  Rationale: Backend fan-out and SSE setup overhead must be minimal; model
  thinking time is outside our control.

### Security

NFR-SEC-01: OpenRouter API key MUST NOT be exposed to the frontend or included
  in any client-side bundle so that the key cannot be extracted from browser
  dev tools.
  Rationale: Single API key; leaking it means unauthorized usage.

NFR-SEC-02: Backend MUST validate that requested model IDs are in the free-tier
  allowlist so that a crafted request cannot invoke paid models.
  Rationale: Defense-in-depth against UI bypass or crafted requests.

### Observability

NFR-OBS-01: Backend MUST log each fan-out request with: prompt length, model IDs
  requested, per-model latency-to-first-token, per-model success/failure, and
  total request duration so that performance issues are debuggable.
  Rationale: PoC still needs basic operational visibility.

## Out of Scope

- **Conversation history / multi-turn chat** — single-prompt, single-response only.
- **User accounts / authentication** — anonymous access only.
- **Response ranking, scoring, judging, or voting** — deliberately excluded per product definition.
- **Paid model support** — PoC uses free-tier only.
- **Prompt templates / preset prompts** — user types their own prompt.
- **Mobile-first layout** — responsive down to tablet; phone layout not in scope.
- **Rate limiting / abuse prevention** — acceptable risk for free-tier PoC.
- **Analytics / usage tracking** — no telemetry in PoC.
- **Frontend-direct OpenRouter API calls** — all inference routed through Rust backend to protect API key.

## Requirement Summary

| Category | MUST | SHOULD | MAY | Total |
|----------|------|--------|-----|-------|
| Functional | 12 | 1 | 1 | 14 |
| Non-Functional | 4 | 0 | 0 | 4 |
