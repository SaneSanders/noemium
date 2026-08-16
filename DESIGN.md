# Noemium Design System — "Bold Grid" (+ Ledger honesty layer)

This document is the design law of the project. It is a contract for both
human contributors and AI agents: if it is written here, it overrides
personal taste, framework defaults, and library examples.

**Concept.** A bold printed catalog. Loud Archivo headlines with an electric
offset shadow, cards with ink borders and hard shadows, everything on the
grid. From the "Ledger" concept we keep the *honesty layer*: VERIFIED
stamps and sources printed as footnotes next to every price. The signature
analytic axis is *momentum*, expressed as a redshift/blueshift metaphor:

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
| `--nm-bg-paper` | `#111114` | `#F4F4F0` | Page background. |
| `--nm-bg-card` | `#1B1B21` | `#FFFFFF` | Cards, panels, palette, table surfaces. |
| `--nm-line-soft` | ink @ 14% | ink @ 12% | Hairline dividers inside cards. The only soft border. |
| `--nm-ink` | `#F2F2EC` | `#111111` | Primary text, card borders (1.5px), hard shadows. |
| `--nm-ink-dim` | `#9C9C94` | `#6B6B63` | Secondary text, captions, metadata. |
| `--nm-accent` | `#5B74FF` | `#3B5BFF` | Electric. The only interactive accent: links, buttons, focus, selection, offset shadows, VERIFIED stamps. |
| `--nm-on-accent` | `#FFFFFF` | `#FFFFFF` | Text/icons on accent or verdict fills. |
| `--nm-shift-near` | accent | accent | Blueshift: positive momentum. |
| `--nm-shift-steady` | `#9C9C94` | `#6B6B63` | Steady momentum. |
| `--nm-shift-far` | `#E0593F` | `#C2402F` | Redshift: negative momentum. |
| `--nm-verdict-ship` | `#2FA36B` | `#1E7F4F` | Verdict "ship it". |
| `--nm-verdict-situational` | `#D19A2E` | `#B07C1F` | Verdict "situational". |
| `--nm-verdict-skip` | `#E0593F` | `#C2402F` | Verdict "skip". |

Rules:

- Verdict colors are semantic. Never use `verdict-ship` to mean generic
  "success" in unrelated UI, and never restyle a verdict with a non-verdict
  color.
- `accent` is the only interactive accent. Buttons, links, active filters,
  focus states, offset text shadows.
- Text on top of `accent` or verdict fills uses `on-accent` — never
  `bg-card`/`text-card` for that (the card color flips between themes).
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
  keyboard hints, kickers, metadata.

Rules:

- **All numbers in data are mono with `tabular-nums`.** Prices, context
  windows, benchmark scores, dates, counts. Use the `nm-num` helper class or
  `font-mono tabular-nums`.
- Archivo is never used for body copy, inputs, or tables.
- Kickers (section eyebrows) are mono, uppercase, accent, with a short
  accent dash before them.
- **Readability floor.** Body copy is 15px+ (`text-[15px]` and up). Meta
  labels and stamps bottom out at 11px; nothing in the UI renders below
  11px. Primary content is never dimmed below `opacity-65`.

## Components

Signature patterns (CSS lives in `src/styles/theme.css`):

- `.nm-card` / `.nm-card-hover` — card, ink border 1.5px, radius 14px.
  On hover it lifts `-3px` and throws a hard shadow `4px 4px 0 ink`.
- `.nm-btn` `.nm-btn-solid` / `.nm-btn-outline` — slab buttons (solid
  electric / transparent with ink border), hard shadow, press on `:active`.
  Every tool detail page leads with a solid "Visit site" button.
- `.nm-sticker` + `-ship/-situational/-skip` — verdict sticker: solid
  verdict color, white uppercase Archivo 800, slight rotation (±2deg).
- `.nm-verified` — Ledger VERIFIED stamp: mono, accent border, slight
  rotation. Carries `last_verified` on every tool card and detail page.
- Sources — receipts render as a numbered Ledger footnote list; prices on
  detail pages carry a superscript reference.
- `SectionHeader` — mono kicker + Archivo 900 uppercase title with offset
  shadow.
- `KbdHint` — keyboard shortcut hint (`⌘K` etc.), mono, ink border.
- `CommandPalette` — global search/navigation overlay.
- Theme toggle — sun/moon button in the header; icons swap via
  `:root[data-theme='light']` rules in `theme.css`.

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
- **Decorative ordinal numbering.** No `№ NN` entry numbers, no `01 /`
  section indices, no numbered nav links. (Functional numbering — quiz
  progress, receipt footnotes — stays.)
- **Border radii above 14px.** Only 4 / 10 / 14 exist (plus full rounds for
  the search chip and verdict dots). No soft diffuse shadows — hard offset
  shadows only.
- **Raw hex outside `tokens.css`.** Including inline styles and SVG fills.
- **`!important`.** Fix specificity properly.
- **WebGL / Three.js / GSAP.** Removed with the Observatory theme; do not
  reintroduce.
- **Autoplaying audio.** Ever.
