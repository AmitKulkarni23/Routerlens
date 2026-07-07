# Round-Trip Intelligibility — grade OpenRouter's TTS providers by whether a machine can understand them, not by how "natural" they sound

## The insight

OpenRouter ranks TTS by usage/popularity, and every TTS leaderboard elsewhere ranks by **naturalness** (subjective MOS, human raters, vibes). But for a **voice agent** — the actual use case — naturalness is a vanity metric. The load-bearing question is: **when this TTS output hits the next hop (a human, or more often another STT/agent in the pipeline), does the content survive?** That's *intelligibility*, and it is objectively measurable with zero human raters via a **round trip**: take reference text → TTS provider → feed the audio back through a fixed high-quality STT → compute WER against the original text. High round-trip WER = the voice mangles words, drops numbers, garbles names, collapses on non-English — regardless of how pleasant it sounds.

The non-obvious, publishable claim: **the TTS provider that tops OpenRouter's popularity ranking is not the one that best preserves meaning through a pipeline — and the gap widens exactly where agents need it most (spelled names, phone numbers, non-English, code/URLs).** You are using OpenRouter's own STT stack to audit OpenRouter's own TTS stack — pure platform-native, and it exposes a metric that literally exists nowhere.

Objective end-to-end: reference text is ground truth, WER is mechanical. Test batteries that break TTS: digit strings, alphanumeric IDs, homophone-heavy sentences, non-English, proper nouns.

## Why OpenRouter can't/won't do it

TTS providers are paying customers → they'll publish "most popular voice," never "least intelligible voice." And the framing is structurally adversarial to their own STT too (you're grading provider A's TTS with provider B's STT), so any honest cross-grading is something a neutral vendor cannot ship without picking fights with its own suppliers. Off their telemetry axis as well — they never compute WER because they hold no reference text.

## Riskiest assumption + cheap test

**Riskiest assumption:** round-trip WER separates providers meaningfully *and* correlates with real intelligibility rather than just measuring the STT's weaknesses. If a fixed strong STT transcribes every TTS near-perfectly, or if all the error is STT noise, there's no signal.

**Half-day spike:** 3 TTS providers × one fixed strong STT × 60 reference lines (20 plain, 20 digit/ID strings, 20 non-English). Compute round-trip WER per provider. Two checks: (1) does provider ranking by round-trip WER differ from OpenRouter's popularity ranking (the thesis)? (2) is the error concentrated in the hard batteries (digits/names/non-English), proving it's TTS intelligibility not random STT noise? Control for STT by also transcribing human recordings of the same lines — that WER floor is the STT's own error; anything above it is the TTS. Paid endpoints + BYOK key required.

## Moat notes — honest

(b) non-obvious correct insight (intelligibility ≠ naturalness ≠ popularity, made objective) + (c) trust. Compounding asset: the adversarial test battery you design (the hard cases that break voices) and the per-release time-series. **Caveat, stated plainly:** the method is cheap to copy once described — the defensibility is the curated hard-case corpus, being first/continuous on OpenRouter's exact provider matrix, and owning the "which voice model is actually intelligible for agents" narrative. Thinner code moat than the Nerf Index; strongest as a *sister audit* published under the same auditor brand as #1 and the accent WER audit, compounding one reputation across quality, security, accent, and voice.
