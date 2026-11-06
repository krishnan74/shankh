# Status page design — "The Alarm"

The page is a stage prop for a 3-minute pitch and a self-explaining product page afterwards. It's one dynamic Server Component (`app/page.tsx`) that reads Sepolia and the Arkiv testnet on every request; client components only animate or handle interaction and receive data as props.

## The two visual ideas

**1. The key that dies.** A credential is the protagonist. `KeyCard` (hero) is built from the latest real `shankh.report` and walks a state track — Active → Exposed → Reported → Kill triggered. Teal marks where Shankh acts, red marks the attacker, grey/dashed means not reached. The same language runs through the race timeline (red "stolen key used", teal "kill") and the live-proof feed.

**2. The conch ripple.** One teal origin emits rings that reach many neutral nodes — one report protecting many machines. `ConchRipple` sits behind the hero key card, marks every section divider, and fills the honest close, where the nodes render "protected" (teal outline) as the rings pass. 1px strokes, drawn once on enter.

## Tokens

- Warm near-black/near-white surfaces, unchanged from before (`app/globals.css`).
- **One accent** (teal) only on what Shankh adds. Never on the problem or attacker side. Inverted panels swap to the opposite theme's teal (`--accent-inverse`, `.tone-inverted`) — otherwise dark-mode teal on an inverted light panel measured ~1.6:1.
- Red / amber / emerald only for real risk tiers and attack outcomes.
- **Three type roles, never mixed:** Fraunces (headlines, `font-display`), Geist Sans (body/UI), Geist Mono (data and kickers only, via `.label`).

## Motion

- Exactly one easing: `--ease: cubic-bezier(0.16, 1, 0.3, 1)`.
- One state drives every draw-on-enter: `Reveal` sets `[data-reveal="in"]` once; CSS keys the ripple rings, timeline tracks and fade-ups off it. The terminal's line reveal and the alarm pulse on the primary CTA are the only other motion.
- Everything animated sits under `prefers-reduced-motion: no-preference`. With reduced motion, every element renders in its final state and the terminal's replay button isn't offered.
- No animation libraries, no image requests (SVG and CSS only), no new runtime dependencies.

## Layout

Two widths: reading content (section headers, case files) at `max-w-3xl`; evidence (hero, race timeline, terminal + feed, ENS tree, honest close) breaks out to `max-w-6xl`. The 12-column kicker/headline header (`SectionHeader`) is the page's spine. A fixed presenter rail (`lg+`) shows the five beats, highlights the current one, and `j`/`k` jump between them.

## Live reads (all request-time, none cached)

| Shown | Source |
|---|---|
| Block number in the top bar | `getBlockNumber()` on Sepolia (`lib/chain.ts`) |
| `pypi.shankh.eth` "emancipated" tag | `isEmancipated()` on the registry (`lib/registry.ts`) |
| `shankh.source`, revoked count | ENSIP-10 `resolve()` text records (`lib/ens.ts`) |
| KillSwitch address, maintainer | `maintainer()` (`lib/killswitch.ts`) |
| The two "REVERTED" attack attempts | `eth_call` simulations re-run every request (`lib/proofs.ts`) |
| Key card, report feed, proof-strip counts, ledger | `shankh.report` entities on Arkiv (`lib/arkiv.ts`) |

Any failed read renders an honest degraded state ("couldn't reach Sepolia just now — reload to retry"), never a placeholder value. If an attack simulation ever stops reverting, the page says so in red instead of showing a stale revert.

## Deliberate deviations from the redesign brief (correctness)

The brief's own first rule is "never fake data." Where a requested detail would have broken it, the page shows what's actually true instead:

- **Terminal:** shows the real recorded `shankh verify evilpkg==1.0.0` run. The brief's `litellm==1.107.0` title and "key deactivated" line were never run and never happened.
- **Key card's last state** is "Kill triggered," drawn dashed — the AWS deactivation isn't built. Drawing "Inactive" solid would claim an action that never happened.
- **Revert proofs have no tx links.** The original attempts reverted at gas estimation, so no transaction was mined and there's no hash to link. Instead each attempt is re-simulated live on every request, which is stronger evidence than a link.
- **Race timeline:** only timestamps in `plan-2.md`'s verified sources. No calendar day ("21 Oct") or Docker start time (13:53) — neither is sourced. The "With Shankh" track is labeled a counterfactual with an unmeasured "minutes" target, since Shankh didn't exist then and its kill time hasn't been measured.
- **Case files:** no "~2,500 orgs" figure — it isn't in any source we've verified.
- **Honest close:** says the install gate is *not yet* built rather than "Shankh also blocks the install."
- **Report feed has no time column** — reports carry no timestamp and `$createdAt` isn't queryable on Arkiv.
- **Arkiv entities aren't linked** — we have no verified public Arkiv explorer URL.

## Non-negotiables checklist (verified 2026-11-06)

- [x] **Dynamic SSR:** `export const instant = false` + `await connection()` kept; route builds as `ƒ (Dynamic)`; the block number changed between consecutive loads.
- [x] **No fake data:** every live value traced in the table above; deviations listed above.
- [x] **One accent:** teal only on Shankh-side elements; red/amber/emerald only for tiers and attacks.
- [x] **One easing:** `--ease` is the only curve in `globals.css` and components.
- [x] **Three type roles:** Fraunces / Geist Sans / Geist Mono, separated as above.
- [x] **Reduced motion:** with `prefers-reduced-motion: reduce` emulated, 0 elements left at opacity 0, no replay button, CTA pulse off (`docs/screenshots/desktop-dark-reduced-motion.jpg`).
- [x] **Grain overlay** kept; no image requests; no new runtime dependencies.
- [x] **No horizontal scroll at 360px:** 0 overflowing elements measured at an emulated 360px viewport.
- [x] **Performance (production build, local):** LCP 1.41s, CLS 0.00.
- [x] **Lighthouse Accessibility:** 96 (mobile). Best Practices 100, SEO 100.
- [ ] **WCAG AA everywhere — conflicts with a token.** The only failing audit is `text-tertiary` itself: 42% opacity measures 3.75:1 on the dark surface, under AA's 4.5:1. The brief fixes this token ("text-tertiary (42%)") *and* requires AA, so it's left as specified pending a decision: raising it to ~60% passes AA in both themes but nearly merges it with `text-secondary` (64%).

## Screenshots

`docs/screenshots/`: `desktop-light.jpg`, `desktop-dark.jpg`, `mobile-light.jpg`, `mobile-dark.jpg`, `desktop-dark-reduced-motion.jpg`.
