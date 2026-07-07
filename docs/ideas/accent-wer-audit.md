# Accent & Language WER Audit — objective word-error-rate for OpenRouter's new STT providers, broken down by accent and language

## The insight

OpenRouter just launched unified Speech-to-Text (multiple providers behind one endpoint: GPT-4o-mini-transcribe, Voxtral, others) and ranks them by **usage/popularity** — not accuracy. There is no published per-provider word-error-rate, and critically, none **stratified by accent and language**, which is where STT actually breaks. Research already shows non-English degrades up to ~16% and low-resource/accented speech far more; the same holds provider-to-provider on identical audio. So the true, non-obvious claim: **the "best" transcriber on OpenRouter's leaderboard is best for a US-accented English speaker, and can be the worst for a Nigerian, Indian, or Scottish one — and OpenRouter's ranking hides this entirely because it collapses to a single popularity number.**

WER is fully objective — you have ground-truth transcripts, no LLM judge, no subjectivity. Feed labeled accent corpora (Mozilla Common Voice, L2-ARCTIC, and low-resource-language sets carry speaker accent/locale labels) through every STT provider and compute WER per (provider × language × accent) cell. Headline deliverable: a "does this transcriber understand *you*" matrix, plus the ranked list of provider/accent combos that silently fail.

## Why OpenRouter can't/won't do it

Same auditor conflict as the Nerf Index: the STT providers are paying customers. "Provider X transcribes Indian-accented English at 34% WER" disparages inventory they monetize, so they will publish popularity, never accuracy-by-accent. And it's off their telemetry axis — they see request volume and latency, not ground-truth WER, because they don't have the reference transcripts. An outsider with labeled corpora does.

## Riskiest assumption + cheap test

**Riskiest assumption:** provider-to-provider WER spread *on the same audio* is large enough (and accent-dependent enough) to be a story — not just "all STT is ~95% now, who cares." If every provider transcribes every accent near-perfectly, there's no gap.

**Half-day spike:** 3 STT providers × 4 accent groups (US, Indian, Nigerian, Scottish English) × 40 Common Voice clips each. Compute WER per cell. Two checks: (1) does provider ranking *reorder* across accents (the whole thesis)? (2) is any single provider's WER spread across accents big enough to matter (>5–10 pts)? If yes, the matrix is the product — and note STT has no free tier here, so budget a few dollars and a BYOK key (the free-tier 429 wall from the #3 spike applies).

## Moat notes — honest

(a) proprietary data + (c) auditor trust. The compounding asset is the accent-labeled audio corpus you curate and the WER time-series (re-run per provider release = "provider X regressed on Arabic in August"). The harness is a day; the corpus and the track record are not. **Caveat:** public accent corpora are also public to copiers — the real moat is being first to run it continuously on OpenRouter's specific provider set and owning the "which transcriber understands my accent" search intent before anyone else. Distribution-heavy, honestly.
