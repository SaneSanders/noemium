# Noemium Design System — Cover 2.0 (+ Ledger honesty layer)

This document is the design law of the project. It is a contract for both
human contributors and AI agents: if it is written here, it overrides
personal taste, framework defaults, and library examples.

**Concept.** Cover 2.0: ink-night field (`#0D1F4B`), cream land, cobalt
spark. Fraunces for display, IBM Plex Mono for everything else, Syne only
on the hero punch. Hairline borders, no offset shadows. The catalog is the
same world as the map — not a second skin. Honesty layer stays: VERIFIED
stamps and sources next to prices. The analytic axis is *momentum*:

- **blueshift** (`shift-near`) — the object is moving toward us: gaining
  momentum, shipping, improving. Shares the electric accent.
- **redshift** (`shift-far`) — the object is receding: stagnating,
  enshittifying, being abandoned.
- **steady** (`shift-steady`) — holding course.

## Palette

All color values live in `src/styles/tokens.css` and nowhere else. Components
reference tokens (via Tailwind utilities or `var(--nm-*)`), never raw hex.

**The site is dark-first.** `:root` holds the dark theme; the light theme is
an override under `:root[data-theme='light']`, toggled from the header and
persisted in `localStorage` (`nm-theme`). Both themes must always work —
never hardcode a one-theme assumption into a component.

| Token | Dark (default) | Light | Use |
| --- | --- | --- | --- |
| `--nm-bg-paper` | `#0D1F4B` | `#F3EFE4` | Catalog page background — same ink as the cover sky. |
| `--nm-bg-card` | `#0D1F4B` | `#F3EFE4` | Cards sit on paper — no lifted panel. |
| `--nm-line-soft` | ink @ 14% | ink @ 12% | Hairline dividers inside cards. |
| `--nm-ink` | `#F3EFE4` | `#121212` | Primary text. |
| `--nm-ink-dim` | cream @ 68% | deep @ 68% | Secondary text, captions, metadata. |
| `--nm-accent` | `#2438FF` | `#2438FF` | Cobalt. The only interactive accent. |
| `--nm-field` | `#2438FF` | same | Cobalt spark. Hero punch, map rings, mast current. Does not invert. |
| `--nm-cream` | `#F3EFE4` | same | Cover land and type on the field. |
| `--nm-deep` | `#0D1F4B` | same | Cover sky — poster ink night. |
| `--nm-on-accent` | `#F3EFE4` | `#F3EFE4` | Text/icons on accent or verdict fills. |
| `--nm-shift-near` | accent | accent | Blueshift: positive momentum. |
| `--nm-shift-steady` | ink-dim | ink-dim | Steady momentum. |
| `--nm-shift-far` | `#E0593F` | `#C2402F` | Redshift: negative momentum. |
| `--nm-verdict-ship` | `#2FA36B` | `#1E7F4F` | Verdict "ship it". |
| `--nm-verdict-situational` | `#D19A2E` | `#B07C1F` | Verdict "situational". |
| `--nm-verdict-skip` | `#E0593F` | `#C2402F` | Verdict "skip". |

Rules:

- Verdict colors are semantic. Never use `verdict-ship` to mean generic
  "success" in unrelated UI, and never restyle a verdict with a non-verdict
  color.
- `accent` is the only interactive accent. Buttons, links, active filters,
  focus states.
- Text on top of `accent` or verdict fills uses `on-accent` — never
  `bg-card`/`text-card` for that (the card color flips between themes).
- Borders are hairline: 1px ink/cream at ~16% mix. No offset shadows.
  No other border colors.

## Typography

Three families, loaded via Fontsource:

- `--nm-font-display` — **Fraunces** (400/500). Headlines and card names.
  Sentence case, light weight, tight leading. No offset shadow.
- `--nm-font-body` — **IBM Plex Mono**. Body, UI, nav.
- `--nm-font-mono` — **IBM Plex Mono**. Data, numbers, kickers. Same family.

Rules:

- **All numbers in data are mono with `tabular-nums`.** Prices, context
  windows, benchmark scores, dates, counts. Use the `nm-num` helper class or
  `font-mono tabular-nums`.
- Archivo is never used. Display is Fraunces; everything else is IBM Plex Mono.
- Kickers (section eyebrows) are mono, uppercase, field/accent. No slab titles.
- **Readability floor.** Body copy is 17px+ (`--nm-text`). Meta labels and
  stamps bottom out at 13px; nothing in the UI renders below 13px. Primary
  content is never dimmed below `opacity-70`. Kickers stay 13px, not 10px.

## Components

Signature patterns (CSS lives in `src/styles/theme.css`):

- `.nm-card` / `.nm-card-hover` — hairline card, radius 0. Hover recolors
  the border to accent. No lift, no offset shadow.
- `.nm-btn` `.nm-btn-solid` / `.nm-btn-outline` — rectangular buttons
  (solid cobalt / hairline). Every tool detail page leads with a solid
  "Visit site" button.
- `.nm-sticker` + `-ship/-situational/-skip` — verdict sticker: outline,
  mono uppercase, no rotation.
- `.nm-verified` — Ledger VERIFIED stamp: mono, accent hairline. Carries
  `last_verified` on every tool card and detail page.
- Sources — receipts render as a numbered Ledger footnote list; prices on
  detail pages carry a superscript reference.
- `SectionHeader` — cover lede: Fraunces sentence-case title, plex sub.
- Logos — committed PNGs in `public/logos/` (`scripts/fetch-logos.mjs`).
  Every catalog surface shows a hairline tile. Missing files fall back to
  a letter tile (Fraunces first letter, accent, on paper). Models reuse
  the lab's logo; they do not get a unique mark per checkpoint.
- `KbdHint` — keyboard shortcut hint (`⌘K` etc.), mono, ink border.
- `CommandPalette` — global search/navigation overlay.
- Theme toggle — sun/moon button in the header; icons swap via
  `:root[data-theme='light']` rules in `theme.css`.

## Motion

No WebGL, no animation libraries, no perpetual rAF loops. Motion is CSS
transitions only:

- Hover recasts the hairline — `--nm-dur-1/2` (80–160ms). No lift.
- Section reveal on scroll (`data-reveal` + `src/fx/reveal.ts`,
  IntersectionObserver toggling `.nm-reveal`) — `--nm-dur-3` (320ms), fade
  + 14px rise, once.
- Multi-step UIs (quiz) use the `.nm-step` micro fade.

`prefers-reduced-motion` collapses everything: no reveal, no lifts, no
sticker animation.

## FORBIDDEN

- **Purple/blue-violet gradients.** The "AI slop" marker. Any indigo-to-purple
  or violet gradient is an instant reject in review. Language is flat color
  and hairlines.
- **Glassmorphism blur** (`backdrop-filter: blur`, frosted panels) on catalog
  chrome. Map search may use a light blur over the night sky.
- **Emoji in the UI.** Icons are SVG or typographic marks only.
- **Decorative ordinal numbering.** No `№ NN` entry numbers, no `01 /`
  section indices, no numbered nav links. (Functional numbering — quiz
  progress, receipt footnotes — stays.)
- **Border radii.** Radius tokens are 0. No offset shadows. No slab
  uppercase on Fraunces.
- **Raw hex outside `tokens.css`.** Including inline styles and SVG fills.
- **`!important`.** Fix specificity properly.
- **WebGL / Three.js / GSAP.** Removed with the Observatory theme; do not
  reintroduce.
- **Autoplaying audio.** Ever.

### Cover exceptions

The cover world (home, map, autopsy, signals, reference, method) is always the
ink-night field in both themes by design. Base catalog pages carry the theme
toggle; Cover pages intentionally do not flip. Three visual exceptions are
whitelisted for the cover world only:

- Circular `border-radius` on the hero moon and ground (poster art, not UI
  chrome).
- The hard offset shadow on the map tooltip card, tokenized as `--nm-shadow`.
- The light `backdrop-filter: blur` on the map find-bar, already permitted for
  map search.
