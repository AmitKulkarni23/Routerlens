# Roadmap — future directions

Ideas noted for after v1 ships. Not commitments; ordered roughly by strategic value.

## 1. Incident subscriptions — "model weather service"

The incidents table plus a subscribe layer. RSS first (v1), then per-provider feeds, webhooks, and email digests. Turns the dashboard from a page-you-visit into a service-in-your-stack. This is the highest-leverage extension: it compounds the moat (the time series) into distribution.

## 2. "OpenRouter Wrapped" — charm tier

Shareable cards from a user's own OpenRouter activity: spend, top models, busiest day. The one strategic card: **"which model you should have used"** — powered by our cost-per-correct-answer data. Pure distribution/delight; builds no moat by itself, but funnels attention to the core product.

## 3. Reverse-routing self-serve — "bring your own test set"

Upload N prompts + expected answers → the engine runs them across the model × provider grid → returns "cheapest configuration that passes >X%". Turns the probing engine from our benchmark into the user's benchmark. Monetizable; heaviest lift of the three.
