# Noemium Design System — "Bold Grid" (+ Ledger honesty layer)

This document is the design law of the project. It is a contract for both
human contributors and AI agents: if it is written here, it overrides
personal taste, framework defaults, and library examples.

**Concept.** A bold printed catalog. Loud Archivo headlines with an electric
offset shadow, white cards with ink borders and hard shadows, everything on
the grid. From the "Ledger" concept we keep the *honesty layer*: entry
numbers (№ NN), VERIFIED stamps, and sources printed as footnotes next to
every price. The signature analytic axis is *momentum*, expressed as a
redshift/blueshift metaphor:

- **blueshift** (`shift-near`) — the object is moving toward us: gaining
  momentum, shipping, improving. Shares the electric accent.
- **redshift** (`shift-far`) — the object is receding: stagnating,
  enshittifying, being abandoned.
- **steady** (`shift-steady`) — holding course.

## Palette

All color values live in `src/styles/tokens.css` and nowhere else. Components
reference tokens (via Tailwind utilities or `var(--nm-*)`), never raw hex.

| Token | Value | Use |
| --- | --- | --- |
| `--nm-bg-paper` | `#F4F4F0` | Page background. |
| `--nm-bg-card` | `#FFFFFF` | Cards, panels, palette, table surfaces. |
| `--nm-line-soft` | ink @ 12% | Hairline dividers inside cards. The only soft border. |
| `--nm-ink` | `#111111` | Primary text, card borders (1.5px), hard shadows. |
| `--nm-ink-dim` | `#6B6B63` | Secondary text, captions, metadata. |
| `--nm-accent` | `#3B5BFF` | Electric. The only interactive accent: links, buttons, focus, selection, offset shadows, VERIFIED stamps. |
| `--nm-shift-near` | `#3B5BFF` | Blueshift: positive momentum. |
| `--nm-shift-steady` | `#6B6B63` | Steady momentum. |
| `--nm-shift-far` | `#C2402F` | Redshift: negative momentum. |
| `--nm-verdict-ship` | `#1E7F4F` | Verdict "ship it". |
| `--nm-verdict-situational` | `#B07C1F` | Verdict "situational". |
| `--nm-verdict-skip` | `#C2402F` | Verdict "skip". |

Rules:

- Verdict colors are semantic. Never use `verdict-ship` to mean generic
  "success" in unrelated UI, and never restyle a verdict with a non-verdict
  color.
- `accent` is the only interactive accent. Buttons, links, active filters,
  focus states, offset text shadows.
- The page is light-first. There is no dark theme.
- Borders are ink 1.5px (`border-[1.5px] border-ink`) or the soft hairline.
  No other border colors.

## Typography

Three families, loaded via Fontsource:

- `--nm-font-display` — **Archivo** (800/900). Display headings, section
  titles, card names, big numbers. Uppercase, tight leading (~0.94–0.98),
  negative tracking. Large headlines carry the signature offset shadow:
  `text-shadow: 6px 6px 0 accent` (`text-shadow-display`), section titles
  4px (`text-shadow-section`).
- `--nm-font-body` — **Inter** (400/500/600/700). Everything else: body
  copy, UI labels, nav.
- `--nm-font-mono` — **JetBrains Mono** (400/500/700). Data, numbers, code,
  keyboard hints, entry numbers (`№ 041`), kickers, metadata.

Rules:

- **All numbers in data are mono with `tabular-nums`.** Prices, context
  windows, benchmark scores, dates, counts. Use the `nm-num` helper class or
  `font-mono tabular-nums`.
- Archivo is never used for body copy, inputs, or tables.
- Kickers (section eyebrows) are mono, uppercase, accent, with a short
  accent dash before them.

## Components

Signature patterns (CSS lives in `src/styles/theme.css`):

- `.nm-card` / `.nm-card-hover` — white card, ink border 1.5px, radius 14px.
  On hover it lifts `-3px` and throws a hard shadow `4px 4px 0 ink`.
- `.nm-btn` `.nm-btn-solid` / `.nm-btn-outline` — slab buttons (solid
  electric / transparent with ink border), hard shadow, press on `:active`.
- `.nm-sticker` + `-ship/-situational/-skip` — verdict sticker: solid
  verdict color, white uppercase Archivo 800, slight rotation (±2deg).
- `.nm-verified` — Ledger VERIFIED stamp: mono, accent border, slight
  rotation. Carries `last_verified` on every tool card and detail page.
- Entry numbers — `№ NN`, the tool's deterministic position in the
  alphabetically sorted catalog (`src/lib/tool-numbers.ts`).
- Sources — receipts render as a numbered Ledger footnote list; prices on
  detail pages carry a superscript reference.
- `SectionHeader` — mono kicker + Archivo 900 uppercase title with offset
  shadow.
- `KbdHint` — keyboard shortcut hint (`⌘K` etc.), mono, ink border.
- `CommandPalette` — global search/navigation overlay.

## Motion

No WebGL, no animation libraries, no perpetual rAF loops. Motion is CSS
transitions only:

- Hover lifts/presses on cards and buttons — `--nm-dur-1/2` (80–160ms).
- Section reveal on scroll (`data-reveal` + `src/fx/reveal.ts`,
  IntersectionObserver toggling `.nm-reveal`) — `--nm-dur-3` (320ms), fade
  + 14px rise, once.
- Multi-step UIs (quiz) use the `.nm-step` micro fade.

`prefers-reduced-motion` collapses everything: no reveal, no lifts, no
sticker animation.

## FORBIDDEN

- **Purple/blue-violet gradients.** The "AI slop" marker. Any indigo-to-purple
  or violet gradient is an instant reject in review. (All gradients are
  suspect — the language is flat color and hard shadows.)
- **Glassmorphism blur** (`backdrop-filter: blur`, frosted panels).
- **Emoji in the UI.** Icons are SVG or typographic marks only.
- **Border radii above 14px.** Only 4 / 10 / 14 exist (plus full rounds for
  the search chip and verdict dots). No soft diffuse shadows — hard offset
  shadows only.
- **Raw hex outside `tokens.css`.** Including inline styles and SVG fills.
- **`!important`.** Fix specificity properly.
- **WebGL / Three.js / GSAP.** Removed with the Observatory theme; do not
  reintroduce.
- **Autoplaying audio.** Ever.
