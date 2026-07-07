# Guardrails Observatory — independent effectiveness data for OpenRouter's security guardrails, which they ship but do not measure publicly

## The insight

OpenRouter sells a security feature with zero published efficacy data. Their prompt-injection guardrail is regex over OWASP-derived patterns (eight attack categories, plus typoglycemia/Base64/spacing countermeasures). The docs themselves admit: "Regex-based detection is not exhaustive. Sophisticated or novel injection techniques may not be caught" and "False positives are possible." No catch rate. No false-positive rate. No benchmark. Their own recommended workflow — "run flag mode first to measure your false-positive rate" — outsources the measurement to every customer individually, which means the measurement is the missing product.

The observatory: run known injection corpora (public jailbreak sets, encoding evasions, multilingual variants) and benign-but-security-flavored corpora (pentest writeups, CTF discussion, security docs — the false-positive bait) through the guardrail in flag mode. Publish: catch rate per attack category, false-positive rate per benign category, and which evasion classes slip through. Then re-run on every changelog release — the *second* axis is a patch-response time-series: "evasion class X reported day 0, caught by their regex on day N." Defensive security research on a documented, publicly shipped filter — measurement, not exploitation.

## Why OpenRouter can't/won't do it

Publishing "our free guardrail catches 61% of category-3 injections" undermines the feature they market; publishing nothing is their dominant strategy, and the docs' hedging language shows they know it. A security feature's effectiveness data is only credible from someone who doesn't sell the feature. Same auditor logic as the nerf index, applied to security instead of quality.

## Moat type

(c) trust/distribution — independent security measurement is citable in a way vendor claims never are, and security findings travel (HN, security newsletters, the OWASP orbit). Secondary (a): the corpus of confirmed-slipping evasions and the patch-response time-series compound with every OpenRouter release.

## One-day test verdict

A day gets you "I ran one jailbreak list through flag mode." It does not get you a stratified corpus mapped to their eight categories, a false-positive suite that's actually hard, or the per-release longitudinal record. Passes — the curation and the track record are the product, the harness is trivial.

## Riskiest assumption + cheap test

**Riskiest assumption:** the guardrail's flag mode gives clean, per-request signal (which pattern category matched, machine-readable) so results are attributable — and OpenRouter's ToS tolerates systematic probing of the filter. If flag-mode output is opaque or ToS forbids it, the observatory can't publish.

**Half-day spike:** enable flag mode on a test key, send 30 canonical injections (a few per OWASP category) + 30 benign security-flavored prompts. Inspect exactly what the API/dashboard exposes per request. If matches are attributable per category and nothing in the ToS blocks it, the methodology is sound — scale the corpus. Bonus: if the spike alone finds one clean evasion class that slips through, that's the opening blog post.
