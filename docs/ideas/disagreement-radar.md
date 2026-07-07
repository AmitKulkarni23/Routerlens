# Disagreement Radar — a consumer "confidence meter" for AI answers, powered by whether the models agree, that accumulates a map of where AI is unreliable

## The insight

Consumers have no way to know when an AI answer is a confident hallucination. But there's a free, honest signal hiding in OpenRouter: **when many independent models disagree on a factual claim, that claim is high-risk.** Agreement across architecturally different models is weak evidence of truth; disagreement is strong evidence of "don't trust this." No single-model product can show you this — it's structurally invisible unless you can fan one question out to many models at once, which is exactly the one thing OpenRouter makes trivial.

The consumer product: ask a question (or highlight a claim via browser extension), get an answer plus a **consensus meter** — "5 models, 4 agree" (green) vs. "5 models, 3 different answers" (red, verify this). Simple, visceral, trustworthy-feeling. The byproduct is the real asset: every query deposits a row in a growing **disagreement corpus** — the specific questions, topics, and claim-types where frontier models diverge. That map compounds daily, cannot be backfilled, and is exactly a hallucination-risk atlas nobody publishes.

## Why this can't be copied

Moat is **(accumulated disagreement corpus) + (browser-extension distribution)**. The meter UI is a day of code — stated plainly. What a copier can't get is the historical, growing record of *which real user questions split the models*, keyed to which models and which day (so it also captures models converging/diverging as they update). Distribution compounds it: a browser extension that lives in the toolbar becomes a habit, and habits are switching cost. The corpus is un-backfillable — the questions people asked in month one are gone if you weren't collecting.

Honest caveat: the corpus only has value if it's *used* — either as a public "AI can't agree on these topics" data product, or to train a cheap disagreement-predictor that flags risk without running 5 models every time (which becomes the actual defensible engine). If it's just a meter with no downstream use of the data, the moat is only the extension habit, which is real but modest.

## Doubles as a platform insight

"Here's a map of the claim-space where your catalog's models systematically disagree" is a genuinely non-obvious artifact about OpenRouter's models that OpenRouter doesn't publish — the consumer app is the harvester.

## One-day test verdict

Meter + fan-out: rebuildable in a day. The atlas of disagreement built from real traffic, and the toolbar habit, are not. Passes — asset is the corpus and the distribution, not the fan-out.

## Riskiest assumption + cheap test

**Riskiest assumption:** model disagreement actually correlates with wrongness (i.e., disagreement flags real errors and agreement isn't just shared bias) — *and* consumers read the meter as trustworthy rather than confusing. If models agree confidently on the same wrong answer, the meter is worse than useless.

**Half-day spike:** take 60 questions with known ground truth, split evenly across easy-factual, contested, and known-hallucination-bait. Fan each to 5 free models, compute agreement. Check: does high disagreement predict wrong answers (precision/recall of "red = actually wrong")? If disagreement has real discriminative power, the meter is honest and the corpus is worth collecting. If agreement and correctness are uncorrelated, kill it — the whole premise is dead.
