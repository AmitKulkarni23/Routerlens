# Silent Nerf Index — an immutable public ledger of whether each (model, provider) endpoint on OpenRouter got quietly worse

## The insight

OpenRouter now measures provider quality (Exacto / Auto Exacto), but their measurement has two structural holes an outsider can own:

1. **It's a snapshot, not a record.** Auto Exacto re-ranks providers every 5 minutes to route *now*. Nothing anywhere — OpenRouter, Artificial Analysis, anyone — publishes a longitudinal, immutable time-series answering "was `deepseek/deepseek-chat` on provider X better in March than it is today?" Quality history evaporates the moment it's overwritten by the next routing decision. Every day this isn't being recorded is data lost forever — it cannot be backfilled at any price.
2. **They grade their own homework.** Providers pay OpenRouter. When OpenRouter's internal benchmark says a paying provider degraded, they *deprioritize it silently* — they will never publish "Provider X nerfed Llama for three weeks in June." An independent auditor with published methodology, raw logs, and no provider revenue is the only party that can say it out loud. This is the same reason Moody's isn't run by the bond issuers.

Concretely: a fixed canary suite (tool-call accuracy, instruction following, long-context recall, multibyte/CJK integrity — a verified live failure on FP4 endpoints, refusal drift) runs daily against every free/cheap endpoint, results hashed and published. Headline metric per endpoint: **effective cost = list price ÷ pass rate** — "cost per correct answer," which reorders the entire catalog vs. cost-per-token and absorbs the cost-per-successful-task idea as a column, not a separate product.

Scope discipline: tool-calling snapshots are Exacto's turf. This wins on the *time axis* and the *audit axis*, not the measurement axis.

## Why OpenRouter can't/won't do it

Conflict of interest: their revenue comes from the providers being graded. They ship the *routing consequence* of degradation but structurally cannot ship the *public accusation*. Their docs promise benchmark data "shown publicly soon" — but self-published scores about your own paying suppliers are exactly the numbers nobody trusts. The outsider's version is the citable one.

## Moat type

(a) proprietary data that compounds — the historical time-series is unbuyable and unbackfillable — plus (c) trust as an independent auditor.

## One-day test verdict

The harness: yes, a strong engineer rebuilds it in a day. The moat was never the harness — it's day 1 vs. day 180 of the ledger, and the published track record of calls that turned out right. Passes, because the core asset is the data, and it only exists if you started earlier than the copier.

## Riskiest assumption + cheap test

**Riskiest assumption:** quality on cheap/free endpoints actually varies enough over time to be detectable above sampling noise with an affordable daily canary budget. If endpoints are boringly stable, the ledger is a flatline nobody cites.

**Half-day spike:** pick 5 models × all their providers. Run a 50-prompt canary (exact-answer tasks only — no LLM judge) 3× per endpoint in one day. Two checks: (1) is between-provider variance visible at n=50 (it should reproduce GosuCoder's 27%–100% tool-reliability spread)? (2) is within-endpoint variance small enough that a real regression would clear the noise floor? If yes to both, start the daily cron **that night** — the clock is the moat.
