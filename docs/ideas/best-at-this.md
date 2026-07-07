# Best-at-This — a free consumer tool for one real task (e.g. wedding speeches, cover letters, bedtime stories) whose blind picks build a per-use-case preference corpus

## The insight

OpenRouter's rankings and LMArena measure *general* preference. But consumers don't have general tasks — they have "write my maid-of-honor speech" and "make this cover letter not sound like a robot." Which model is best is **use-case-specific**, and nobody owns per-use-case human preference data because nobody collects it at the point of a real consumer task.

The tool: pick one narrow, emotionally-loaded consumer task. User gives inputs, gets **two anonymized drafts side by side**, picks the one they'll actually use. That pick is a labeled preference vote *for that exact use case* — far higher signal than a lab rating because the user has real stakes (it's their actual speech). Over time you accumulate "for wedding speeches, model X beats Y 68% of the time; for legal cover letters it inverts" — a preference corpus stratified by real consumer intent that neither OpenRouter nor LMArena has. SEO does distribution: "write a wedding speech with AI" is a searched, evergreen query with commercial intent.

Multi-model is load-bearing: the blind A/B *is* the product and the data collector, and it only works because OpenRouter serves both drafts from one key at zero cost.

## Why this can't be copied

Moat is **(per-use-case preference corpus) + (SEO/distribution)**. The generator is a day of code. The copier can't get: months of stakes-weighted human picks stratified by intent, and the accumulated SEO surface (pages, backlinks, ranking) that makes *your* wedding-speech tool the one Google sends people to. Both compound; both start at zero for the second mover. The corpus also lets you auto-route to the winning model per use-case — the tool literally gets better at each task the more it's used, which is a data flywheel, not a static wrapper.

Honest caveat: this is the weakest-moat of the three consumer ideas. SEO moats are real but slow and contestable; the preference corpus only matters if you productize it (per-task routing, or a public "best model for X" data product). A single-task generator with no data loop is just a wrapper — reject that version. The moat lives entirely in stratified data + search distribution, so commit to collecting and using the picks or don't build it.

## Doubles as a platform insight

"Model quality reorders completely by consumer use-case — here's the per-intent leaderboard your global ranking hides" is a true, non-obvious claim about OpenRouter's catalog, harvested by the consumer tool.

## One-day test verdict

The generator: a day. The intent-stratified preference corpus and the SEO position: not. Passes only *if* the picks are collected and used — otherwise it's a wrapper and fails the test outright. Conditional pass.

## Riskiest assumption + cheap test

**Riskiest assumption:** different models genuinely win different consumer use-cases by a wide, stable margin (so per-intent data is worth having) — *and* users will do the blind A/B pick instead of just grabbing the first draft. If one model wins everything, there's no stratification to own; if users won't compare, there's no data.

**Half-day spike:** pick 3 tasks (speech, cover letter, bedtime story). For each, generate 10 pairs across 4 free models, and get 10 people to blind-pick per task. Check: (1) does the winning model differ by task, with margin above noise? (2) will people actually pick, or do they disengage? If wins are task-dependent and people engage with the choice, the corpus is real — ship one task, instrument every pick, expand by SEO demand.
