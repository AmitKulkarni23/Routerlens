<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: Chorus
description: One prompt, many models, side by side.
---

# Design System: Chorus

## 1. Overview

**Creative North Star: "The Parallel Signal"**

Chorus is an engineering statement as much as a tool. The visual system exists to get out of the way and let the live, concurrent streaming take center stage — not to decorate it. Every surface decision defers to the moment the first tokens arrive: multiple panels populating simultaneously, each model speaking for itself, nothing curated. The design's job is to make that moment feel like inevitability, not theater.

The atmosphere is dark, precise, and information-dense without being cluttered. Think a developer's editor at midnight — not a consumer product, not a startup landing page. Depth is earned through tonal layering and purposeful state changes, not shadows or gradients. Motion is transactional: it confirms state and tracks liveness, never entertains. The palette is near-monochromatic; color appears as a signal (interactive element, active stream), not as decoration.

References: Linear (dark surfaces, earned motion, premium density), Vercel (developer authority, tight type, confident neutrals), GitHub (high-information dark mode, precise micro-typography). The voice is the same across all three: power through restraint.

**Key Characteristics:**
- Dark-native by conviction — not theme-switched, not optional
- Restrained accent: one cold blue-violet, ≤10% of any surface, rarity as signal
- Display + mono type system: geometric sans for UI hierarchy, monospace for identifiers, data, streaming content
- Flat-by-default elevation — borders and tonal layering encode structure, shadows do not
- Responsive motion: state transitions and streaming feedback only — no choreography, no entrances

## 2. Colors: The Restrained Dark Palette

Near-monochromatic dark system with a single cold accent. The background is the dominant color; everything else is measured deviation from it.

### Primary
- **Cold Blue-Violet** `[to be resolved during implementation — OKLCH anchor: oklch(62% 0.19 265)]`: The sole accent. Used on interactive elements (buttons, active model chips, focused inputs), active streaming panel borders, and focused states. Its rarity is load-bearing — diluting it kills the system's authority. Approximately Linear's primary accent hue.

### Neutral
- **Near-Black Base** `[to be resolved — anchor: oklch(9% 0.008 250)]`: Page background. The visual floor. Slight cool tint toward 250° avoids the warm-charcoal trap. Not pure black; pure black reads as void, not precision.
- **Dark Surface** `[to be resolved — anchor: oklch(12.5% 0.007 250)]`: Panel and card backgrounds — one step above base. Distinction is subtle and intentional: enough to encode layering, not enough to feel Material.
- **Raised Surface** `[to be resolved — anchor: oklch(16% 0.007 250)]`: Hover states, active containers, dropdown backgrounds.
- **Border** `[to be resolved — anchor: oklch(22% 0.005 250)]`: Structural dividers. Barely visible; present to organize, not to decorate.
- **Primary Ink** `[to be resolved — anchor: oklch(92% 0.005 250)]`: Near-white body text, slightly cool. Not pure white — pure white on near-black creates too much vibration.
- **Muted Ink** `[to be resolved — anchor: oklch(55% 0.005 250)]`: Labels, secondary text, model provider names.
- **Faint Ink** `[to be resolved — anchor: oklch(36% 0.005 250)]`: Placeholder text, disabled states, de-emphasized metadata.

### Status (minimal)
- **Error Red** `[to be resolved — anchor: oklch(56% 0.18 25)]`: Model error panels only. Not used decoratively.
- **Done Green** `[to be resolved — anchor: oklch(70% 0.15 160)]`: Per-panel stream completion indicator. Appears briefly, then fades to neutral.

**The One Voice Rule.** The cold blue-violet accent appears on ≤10% of any given screen. If it appears everywhere, it is a neutral, not an accent — and the system loses its signal vocabulary. Interactive elements earn the accent; everything else stays in the neutral ramp.

**The Warmth Trap Rule.** Never drift the neutral ramp toward warm or brown hues "for atmosphere." Warmth here is carried by content (LLM responses, prompt text, model names), not by surface color. A warm-tinted background turns a precision tool into a café app.

## 3. Typography

**Display Font:** Geometric sans — `[font pairing to be chosen at implementation — reference candidates: Geist, Inter, IBM Plex Sans. Geist preferred for Vercel/Linear alignment]`

**Body/UI Font:** Same geometric sans family as display. UI text throughout.

**Mono Font:** Monospace companion — `[reference candidates: Geist Mono, IBM Plex Mono, JetBrains Mono. Prefer the monospace variant of the chosen display family for visual coherence]`

**Character:** The pairing divides the UI into two registers. The geometric sans owns structure — headings, labels, buttons, navigation, metadata. The monospace owns content — streaming token output, model IDs, code blocks, character counters. The moment tokens arrive in the streaming panel, the font shifts to mono: the user is now reading output, not UI. That register shift is meaningful and must be preserved.

### Hierarchy

- **Display** (700, `clamp(2rem, 5vw, 3.5rem)`, leading 1.05, tracking −0.03em): Page title / hero copy only. One per view.
- **Headline** (600, ~1.5rem, leading 1.2, tracking −0.02em): Section headings, modal titles.
- **Title** (500, ~1rem, leading 1.35): Panel headers, group labels, navigation items.
- **Body** (400, ~0.9375rem / 15px, leading 1.6): Prose, descriptions, UI text. Max line length 65–75ch on prose containers.
- **Label** (Mono, 500, 0.75rem, tracking +0.05em, uppercase): Model provider IDs, status badges, category tags. Monospace in uppercase reads as machine-generated, which is exactly right for model identifiers.
- **Stream / Code** (Mono, 400, 0.875rem / 14px, leading 1.7): Streaming token content, code blocks. The primary reading font for LLM output.

**The Two-Register Rule.** Geometric sans = structure (UI). Monospace = content (model output, identifiers, data). Never swap them. A model name in sans-serif, a heading in mono: both are wrong. The division is the system's personality.

## 4. Elevation

Flat by default. Shadows are prohibited except in one narrow case.

The dark tonal ramp (base → surface → raised surface) encodes depth without shadows. Structural separation uses 1px borders at `border` (22% lightness) or tonal shift. Neither ambient glows nor drop shadows appear at rest.

The single exception: **active streaming panels**. While a model is streaming, its panel gets a `box-shadow: 0 0 0 1px [accent / 30% alpha], inset 0 0 32px [accent / 4% alpha]`. This signals liveness — "this panel is generating right now" — and disappears when the stream completes. It is a state affordance, not a decoration.

**The Flat-By-Default Rule.** Surfaces are flat at rest. The accent glow appears only on actively streaming panels. Done panels return to flat borders. Error panels use the error-red border, no glow. A shadow at rest is a hierarchy claim the interface has not earned.

## 5. Components

*No components yet — this is a seed. Re-run `/impeccable document` once the codebase has a component library to extract. The component vocabulary will include at minimum: model selection chips, prompt textarea, submit button, streaming panel, loading state, model header bar, error panel, and copy button.*

*Until then, design intent:*
- **Buttons**: No rounding beyond 6px. No gradients. No shadows. Accent fill for primary action; ghost (border only) for secondary. Letter-spacing: normal.
- **Model Chips**: Pill shape, border-based unselected, accent-tinted selected. Monospace label.
- **Streaming Panels**: Equal-weight columns with no visual favoritism between models. The system must not editorialize.
- **Input**: Flat, border-defined, accent focus ring via border color shift (not box-shadow).

## 6. Do's and Don'ts

### Do:
- **Do** use near-black with a slight cool tint (toward 250° hue) as the page background. Cool-neutral dark reads as technical authority; warm dark reads as consumer UI.
- **Do** reserve the cold blue-violet accent for interactive and active-state elements only. If it appears on static text, dividers, or background fills, it loses its signal value.
- **Do** shift to monospace when rendering model output, model IDs, and streaming content. The font is the affordance that separates "interface" from "content."
- **Do** use tonal layering (base → surface → raised) to encode depth. One step between layers is enough; three-step jumps create visual noise.
- **Do** keep all response panels at equal visual weight. No panel is larger, brighter, or more prominent than another. The neutrality of the product must be visible in the layout.
- **Do** animate streaming liveness (active border glow, loading cursor) and state transitions (panel enter, chip select). Motion here is functional signal.
- **Do** provide `@media (prefers-reduced-motion: reduce)` alternatives for every transition — crossfade or instant.

### Don't:
- **Don't** use warm-tinted backgrounds, cream, sand, or any hue-toward-warm neutral. This is a precision tool, not a content publication. (Anti-reference: generic AI SaaS landing, warm-tinted editorial templates.)
- **Don't** add shadows at rest. The flat-by-default rule is not stylistic preference — ambient shadows make this look like a consumer card UI.
- **Don't** make it look like ChatGPT or Claude's interface. No conversational chrome, no chat-bubble layout, no avatar icons, no message-thread structure. Chorus is a comparison tool, not a chatbot.
- **Don't** use gradient text (`background-clip: text`). No gradient fills, period. Color is used as signal; gradients dilute the signal vocabulary.
- **Don't** use bold colors, pastel palettes, or rounded-corner friendliness associated with consumer AI products (Perplexity, Poe). The audience is engineers, not general users.
- **Don't** add visual hierarchy between model response panels — no "featured" panel, no larger or more prominent column. Equal weight is a product principle rendered in pixels.
- **Don't** use side-stripe `border-left` accents on panels or cards. If a panel needs a state affordance, it uses a full-perimeter border shift, not a colored left stripe.
- **Don't** add section eyebrows, numbered section markers (01 / 02 / 03), or uppercase tracked labels to structural page sections. These belong on content labels (model IDs, status badges) — not on UI scaffolding.
- **Don't** let academic density creep in (Hugging Face Spaces energy): unstyled code dumps, raw parameter tables, no visual breathing room. This is a portfolio piece — polish is the point.
