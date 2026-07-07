# Spot-the-Model — a viral blind-taste game that accumulates the one dataset nobody has: how *identifiable* each model is to humans

## The insight

Every model-comparison product measures **preference** — which answer is better (LMArena, and OpenRouter's own rankings). Nobody measures **identifiability** — can a human tell which model wrote this, and *which* model has the most recognizable voice. That's a different, unowned axis, and it only exists as a byproduct of a consumer game people play for fun.

The loop: show one prompt and one anonymized answer (or two side-by-side), user guesses the model, gets a score, shares the streak. Each round is a labeled human judgment: "human confused GPT-class output for Llama-class," "everyone nails Claude's voice, nobody can pick Mistral from Qwen." Aggregate that and you own a living map of model *distinctiveness* — a confusion matrix over the whole free catalog that reprices every time a model updates. This is not a preference score; it's a fingerprint database of model voice, built for free by players.

Multi-model is load-bearing: the game is only fun and only produces signal because OpenRouter puts the whole zoo behind one key. One model = no game.

## Why this can't be copied

The moat is **(distribution) + (accumulated human-perception data)**, not the game code — which is trivially one-shottable and I'll say so. A copier ships the same game in an afternoon and starts with zero rounds played. The asset is N million human guesses: the confusion matrix, its drift over model releases, and the leaderboard/streak social loop that makes the *first* game the one people share. LMArena is adjacent but measures the wrong axis (better, not distinguishable) and isn't a shareable game. First mover with a viral loop compounds; the second mover has identical code and an empty database.

Honest caveat: distribution moats for games are fragile — if the loop doesn't go viral, there's no moat, just a clever toy. The data asset only exists if the game gets played. Bet the idea on the loop, not the insight.

## Doubles as a platform insight

The dataset answers a question OpenRouter would love and can't easily produce: *which of our models have a distinct, recognizable voice, and which are interchangeable mush?* That's a legitimate "you saw something true about our catalog" artifact — the consumer game is just the data-collection front end.

## One-day test verdict

The game: yes, rebuildable in a day. The moat was never the game — it's the guesses already logged and the players already sharing. Passes, because the asset is the accumulated confusion matrix and the network of players, not the code.

## Riskiest assumption + cheap test

**Riskiest assumption:** free-catalog models are actually distinguishable enough by humans that guessing beats chance by a wide margin — *and* the result is fun (an ambiguous, unwinnable game isn't shareable). If everything reads as generic assistant-voice, there's no signal and no game.

**Half-day spike:** generate answers to 20 prompts across 6 free models. Run a 15-person blind guess test (friends, a Discord, a subreddit). Two checks: (1) is accuracy meaningfully above 1/6, and is there spread — some models obvious, some impossible? (2) do testers *want another round* unprompted? If yes to both, the loop has a pulse — build it and instrument every guess from round one.
