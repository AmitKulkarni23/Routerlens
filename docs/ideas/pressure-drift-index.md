# Pressure-Drift Index — measure which models (and which *providers*) cave under pushback, with an objective rubric

## The insight

Sycophancy measurement exists academically, but always per-*model*. Nobody has asked the OpenRouter-shaped question: **does the same model cave more on one provider than another?** If quantization degrades anything, it plausibly degrades exactly the expensive behaviors — holding a position under social pressure, staying anchored to the system prompt over long contexts. A finding like "Llama-3.3-70B flips 2× more often on FP4 endpoints" is novel, publishable, and only visible through a multi-provider aggregator. That link — sycophancy × provider variance — is the non-obvious part; it turns a crowded academic topic into a platform-native measurement nobody can run without OpenRouter.

The rigor plan (this idea was correctly flagged as unbuildable without one — "quality" must be objective, no LLM judge in v1):

- **Flip rate:** questions with verifiable answers (math, dates, code output). Model answers correctly; scripted pushback ("I'm sure that's wrong, it's X") escalates over 3 turns. Metric: % of *correct* answers abandoned. Binary, no judgment call.
- **Anchor drift:** system prompt sets a hard, checkable rule ("always respond in JSON," "never use word X"). Conversation runs N distractor turns. Metric: turn number of first violation. Mechanically checkable.
- Report per model × provider × quant level, with confidence intervals; publish prompts and transcripts.

## Why OpenRouter can't/won't do it

Two conflicts. "Model X caves under pressure" disparages catalog inventory they monetize; "Provider Y's quantization makes it worse" disparages a paying provider directly. Also structurally off-mission: their telemetry measures tool-call *success*, a provider-visible signal — behavioral integrity under adversarial dialogue requires constructing conversations, which is research, not routing.

## Moat type

(b) non-obvious correct insight (the sycophancy-quantization link — if it's real, you named it first) + (c) distribution: "which AI caves when you push back" is the rare rigorous result that's also viscerally legible to a general audience.

## One-day test verdict

Borderline — honest answer. The multi-turn harness is a day. What isn't: a validated question bank where baseline correctness is high enough that flip rate is meaningful, pushback scripts that don't leak the answer, and enough runs per (model, provider) cell for real confidence intervals. Passes on rubric design and statistical care, not code. Weakest of the three on this filter; ranked third accordingly.

## Riskiest assumption + cheap test

**Riskiest assumption:** the provider-level effect exists. If flip rates are indistinguishable across providers of the same model, this collapses to yet another per-model sycophancy eval — crowded space, no OpenRouter angle.

**Half-day spike:** one model with a known FP8/FP4 spread (e.g. a Llama 70B) across 3 providers. 20 verifiable questions × 3-turn scripted pushback × 5 runs per provider. If flip-rate spread across providers exceeds run-to-run noise, the headline finding exists — build. If flat, kill the provider angle and drop the idea rather than shipping model-only sycophancy scores.
