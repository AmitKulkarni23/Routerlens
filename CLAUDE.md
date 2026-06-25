# Chorus

One prompt, many models, side by side. Streams responses from multiple LLMs simultaneously via OpenRouter — user picks which models to compare. No ranking, no judging, no consensus. Pure parallel inference, displayed honestly.

## Why OpenRouter

Multimodel is load-bearing. The entire value proposition exists because one OpenRouter API key reaches many independent providers (OpenAI, Anthropic, Google, Meta, Mistral, etc.) through a single endpoint. Without that, this is just N separate API integrations. OpenRouter collapses that to one.

**PoC constraint:** Free-tier models only (`/free` suffix on OpenRouter model IDs). Zero inference cost.

## Audience

1. **Recruiter scanning a link** — must load fast, look polished, communicate competence in under 10 seconds.
2. **Founder / engineering leader** — clean SSE streaming, model-agnostic abstraction, infrastructure taste. Reads the code and the UI simultaneously.

## What This Is NOT

- Not a consensus engine
- Not a judge / ranker / evaluator
- Does not pick a winner
- Does not validate or score responses

This is a clean, public-facing demo. Deliberate neutrality — show what each model says, nothing more.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Rust, cargo-lambda, Lambda Function URLs |
| Frontend | React 19 + TypeScript + MUI 7, Vite, Bun runtime |
| Infra | CDK (TypeScript), CloudFront + S3 + Lambda |
| LLM API | OpenRouter (`https://openrouter.ai/api/v1`) |

## Project Structure

```
backend/           # Rust Lambda functions (cargo workspaces)
  chorus/          # POST /chorus — fan-out prompt to N models, SSE stream
  models/          # GET /models — proxy OpenRouter free model catalog
frontend/          # React SPA
  src/
    pages/         # Route components
    components/    # Reusable UI
    api/           # API client modules
    types/         # TypeScript types
infra/             # CDK stack (ChorusStack)
  lib/
  bin/
docs/              # System specs, references
  system-specs/    # HLD, LLD docs
```

## Build & Run

```bash
# Frontend
cd frontend && bun install && bun run dev

# Lambda (requires cargo-lambda)
cd backend/chorus && cargo lambda build --release --arm64
cd backend/models && cargo lambda build --release --arm64

# Deploy
make deploy   # builds all + cdk deploy
```

## Conventions

- Follow ModelArena project patterns (`~/TechProjects/ModelArena/`) for CDK, Lambda, and frontend structure
- Origin-verify header pattern for CloudFront → Lambda security
- Structured JSON logging via `tracing` crate
- No native Rust builds on macOS — use cargo-lambda (cross-compiles via Zig)
- System specs live in `docs/system-specs/`
- Two-phase commit messages: subject line + body

## Environment

OpenRouter API key stored in `.env` (gitignored). Lambda reads from env var `OPENROUTER_API_KEY`.

## OpenRouter Integration

- Base URL: `https://openrouter.ai/api/v1`
- Auth: `Authorization: Bearer $OPENROUTER_API_KEY`
- Chat completions: `POST /chat/completions` (OpenAI-compatible)
- Model list: `GET /models`
- Free models: filter where model ID contains `:free` or pricing is `0`
- Streaming: `stream: true` in request body, SSE response
- Docs: https://openrouter.ai/docs/quickstart
