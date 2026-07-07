# Router Regret — measure whether OpenRouter's Auto Router actually beats trivial baselines, and whether it degenerates

## The insight

OpenRouter's Auto Router is powered by NotDiamond and sold on one promise: "automatically select the best model for your prompt," tuned by a `cost_quality_tradeoff` knob (0 = quality, 10 = cost, default 7). But two recent papers say the quiet part out loud about *all* learned routers:

- **"When Routing Collapses: On the Degenerate Convergence of LLM Routers"** — learned routers frequently degenerate to routing almost everything to one or two models regardless of input, silently discarding the whole premise.
- **"Rethinking Predictive Modeling for LLM Routing: When Simple kNN Beats Complex Learned Routers"** — trivial baselines (kNN, even random-within-tier) often match or beat the fancy learned router.

So the non-obvious, testable claim: **OpenRouter's Auto Router may be leaving measurable cost-per-correct-answer on the table versus a dumb baseline, and its `cost_quality_tradeoff` knob may be non-monotonic or near-inert** — dial it 0→10 and the model selection barely changes, or changes in a way that doesn't actually trade quality for cost as advertised. This is *regret*: the gap between the model the router picked and the model that would have won on cost-per-correct.

You can observe this from the outside because **the API response reports the model that actually served each request.** So: fixed labeled task set (verifiable answers, no LLM judge) → send each prompt through Auto Router at tradeoff 0, 3, 7, 10 → record chosen model, cost, and correctness → compare against (a) an oracle that always picks the cheapest model that got it right, and (b) a trivial kNN/random-in-tier baseline. Deliverables: router regret ($ overspent per correct answer vs. oracle), a collapse metric (entropy of model selection — is it really routing or just defaulting?), and a monotonicity check on the tradeoff knob.

## Why OpenRouter can't/won't do it

The Auto Router is a paid, partner-powered feature (NotDiamond). "Our router is 30% worse than picking the cheapest passing model, and the cost knob does almost nothing between 3 and 7" is not a number a vendor publishes about its own flagship routing product. And they can't credibly self-grade — the whole value of the audit is that it's run by someone with no stake in the router looking good. Same auditor conflict as the Nerf Index, aimed at their smartest feature instead of their providers.

## Riskiest assumption + cheap test

**Riskiest assumption:** the Auto Router is actually suboptimal enough to have a story. If it's near-oracle and the knob is crisply monotonic, there's no regret to report — and you've spent effort confirming they're good (un-publishable).

**Half-day spike:** 50 verifiable prompts across difficulty tiers (easy factual → hard multi-step). Send each through Auto Router at tradeoff = 0 and 10, plus directly to 3 named models spanning cheap→expensive. Three checks: (1) **collapse** — does Auto Router pick from a wide set or just default to 1–2 models? (2) **knob inertia** — does the 0 vs 10 selection distribution actually differ? (3) **regret** — on the prompts where a cheap model got it right, did the router needlessly pick an expensive one? Any one of the three showing a gap is a publishable finding. Requires a BYOK key (free-tier 429 wall applies); Auto Router spend is real but small at n=50.

## Moat notes — honest

(b) non-obvious correct insight (routers collapse / lose to baselines — academically supported, never measured on OpenRouter's live router) + (c) auditor trust. Compounding asset: the labeled regret-test suite and the per-release time-series ("Auto Router regret dropped after the NotDiamond update in September"). **Blunt caveat:** do NOT let this drift into "build a better router" — that is the insider game (anti-pattern #2). OpenRouter + NotDiamond have the real-traffic preference-data flywheel; an outsider cannot out-*route* them and shouldn't try. The defensible move is strictly to *measure* the router, published under the same auditor brand as the Nerf Index, guardrails, accent, and voice audits — one reputation, now covering their providers, their security, and their smartest feature.
