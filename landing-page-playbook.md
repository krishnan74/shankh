# Landing page = pitch deck + live demo, on one page

Read this before building or reworking a hackathon project's landing/demo page. It is a design playbook extracted from a project where the landing page doubled as the pitch deck (ENS Drive, ETHGlobal Tokyo 2026) — generalized, with that project's exact colors and copy stripped out, so it transfers to any stack.

A hackathon landing page has one job a normal product landing page doesn't: it has to *pitch* a judge in under three minutes, not convert a visitor over several sessions. Treat the page as the deck, not as a page that links to a deck. If a skill for "Awwwards-quality" or immersive web design (e.g. `top-design`) is available, load it explicitly before writing the page — a default pass produces "a normal webpage," not a pitch.

## 1. One scrolling page, structured like a pitch, not like a product site

No separate slides file, no separate demo link. The working product is embedded as a section of the page, in the middle of the narrative, not bolted on after it:

```
Hero (the one-sentence claim)
  → Problem, shown concretely (before/after, not abstract prose)
    → Live demo (the proof — real, not a screenshot or video)
      → How it works (just enough technical credibility)
        → Everything else, collapsed (roadmap, deep technical detail, the ask)
          → Footer (one-line restatement + disclaimers)
```

Every section repeats the same header shape: a small uppercase kicker label, a large headline with one emphasized clause carrying the actual claim, one short supporting sentence. The repetition is what makes scrolling feel like turning pages of a deck.

## 2. Typography does the pitching

Three type roles, never mixed:

- **A display/serif face** for headlines only — large, tight line-height, slightly negative letter-spacing. Makes the page feel like a statement, not a UI.
- **A plain sans face** for all body copy and UI — boring on purpose, so it never competes with the display face.
- **A monospace face** reserved for anything that is literally data: addresses, hashes, status labels, section kickers, small tags. Monospace as a semantic signal ("this is real/technical/verifiable"), not a decorative choice.

One small CSS utility standardizes every uppercase/tracked/mono micro-label across the page, so section markers, tab names, and status chips read as one system.

## 3. One accent color, spent as a narrative device

Exactly one saturated accent color against an otherwise muted/neutral palette, and it marks *only* the thing the product adds that the status quo lacks. "Old/default" stays neutral; the accent appears only where the pitch wants the eye to land. Semantic colors (success/error) are separate from the brand accent and used only for real outcomes, never for emphasis.

A second device: render one panel **inverted** (dark-on-light page or the reverse) to mark "the solution" against "the problem" sitting next to it in the same grid — same card shape, same grid, just flipped, so the eye reads them as a pair.

## 4. A 12-column grid with deliberate asymmetry

Don't center everything in a simple max-width column. Split chapter headers into a narrow label column (kicker) and a wide content column (headline + body), so section markers read as a running ledger down the page. Give supporting cards/diagrams explicit column spans/offsets on the same grid rather than centering each independently, so everything stays aligned across sections.

## 5. Motion: restrained, uniform, one job — confirm the content is real

- Define **one easing curve** once, reuse it for every animation on the page (reveals, toasts, cards). No bespoke curves per component.
- **Scroll-triggered reveals**: every block fades up a short distance the first time it enters the viewport (fires once), siblings staggered with small delays so groups arrive as a cascade. Build one reusable reveal wrapper, use it everywhere instead of each section rolling its own.
- **Smooth/weighted scrolling** (a scroll-easing library) makes the page feel more deliberate — but skip it entirely under `prefers-reduced-motion`, and collapse all animation durations near-zero under that same media query.
- A couple of small looping animations (a moving dash along a diagram connector, a soft pulse around the primary CTA) only to represent the product's own concept or beckon toward one action — never as generic decoration.

## 6. Progressive disclosure: keep the pitch short, put depth one click away

Push everything not needed to *get* the idea into a collapsed, accordion-style "More detail" section at the bottom — technical internals, trust/limits discussion, transaction/action history, roadmap minutiae. The top of the page should read in under a minute; depth is opt-in. This is what separates a pitch from a normal webpage with a lot of sections: the primary path is short and linear, rigor is available but not mandatory reading.

## 7. The demo proves itself in real time — the biggest lever available

Don't stand in a screenshot or a recorded video for "trust us." Embed the live product in the narrative flow, and surface visible, verifiable proof next to every interaction: a small toast/card translating what just happened in plain language, linking out to the real on-chain (or equivalent backend) record. Keep a running activity log of every real action taken in that session, shown in the detail section. This turns the demo from "a feature you can try" into evidence for the pitch's central claim — the whole reason to combine deck and demo on one page.

## 8. A page texture, not gradients or glassmorphism

A very subtle, static, almost-invisible grain/texture overlay (cheap, GPU-free) makes the page read as a considered document rather than a generic SaaS gradient hero. Independent of any specific palette — worth doing regardless of brand colors.

## Checklist for building one

1. Load an "Awwwards-quality"/immersive-design skill explicitly before writing the page, if one is available — a default pass produces a generic page.
2. Structure the page as repeating chapters (kicker → headline with one emphasized clause → one-sentence lede), not generic "feature sections."
3. Pick exactly one display/serif face for headlines, one sans for body, one mono reserved only for data/labels. Don't let their jobs bleed together.
4. Pick exactly one accent color; spend it only on "what's new," never as general brand decoration.
5. Build one reusable scroll-reveal wrapper with one easing curve; reuse it everywhere; respect `prefers-reduced-motion`.
6. Put the live demo/proof inside the narrative, not after or linked out; show real-time feedback for every interaction.
7. Collapse everything non-essential to the pitch into a progressive-disclosure section at the end.
