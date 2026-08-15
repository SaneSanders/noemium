# Noemium Design System — "Observatory"

This document is the design law of the project. It is a contract for both
human contributors and AI agents: if it is written here, it overrides
personal taste, framework defaults, and library examples.

**Concept.** A night observatory. The AI landscape is a deep sky; tools are
celestial bodies; our verdicts are observation logs. The signature analytic
axis is *momentum*, expressed as a redshift/blueshift metaphor:

- **blueshift** (`shift-near`) — the object is moving toward us: gaining
  momentum, shipping, improving.
- **redshift** (`shift-far`) — the object is receding: stagnating,
  enshittifying, being abandoned.

## Palette

All color values live in `src/styles/tokens.css` and nowhere else. Components
reference tokens (via Tailwind utilities or `var(--nm-*)`), never raw hex.

| Token | Value | Use |
| --- | --- | --- |
| `--nm-bg-void` | `#05060B` | Page background. The sky. |
| `--nm-bg-panel` | `#0B0E16` | Cards, panels, header/footer chrome. |
| `--nm-bg-raised` | `#11151F` | Hover states, nested surfaces, code blocks. |
| `--nm-line` | `#1C2231` | Borders, dividers, table rules. Only border color. |
| `--nm-ink` | `#E9EDF6` | Primary text. |
| `--nm-ink-dim` | `#97A1B7` | Secondary text, captions, metadata. |
| `--nm-shift-near` | `#62D9FF` | Blueshift: positive momentum, primary accent, links, focus rings, selection. |
| `--nm-shift-far` | `#FF5A36` | Redshift: negative momentum, warnings, "skip" energy. |
| `--nm-gold` | `#F2C14E` | Featured markers only. Never decorative. |
| `--nm-verdict-ship` | `#5CE0A1` | Verdict "ship it". |
| `--nm-verdict-situational` | `--nm-gold` | Verdict "situational". |
| `--nm-verdict-skip` | `--nm-shift-far` | Verdict "skip". |

Rules:

- Verdict colors are semantic. Never use `verdict-ship` to mean generic
  "success" in unrelated UI, and never restyle a verdict with a non-verdict
  color.
- `shift-near` is the only interactive accent. Buttons, links, active nav
  items, focus states.
- `gold` marks featured content and nothing else.
- The page is dark-first. There is no light theme.

## Typography

Three families, loaded via Fontsource:

- `--nm-font-display` — **Instrument Serif**. Display headings only
  (`h1`, hero statements, section titles). Weight **400 always** — the family
  has no other weight, and faking bold is forbidden. Italic is allowed and
  encouraged for emphasis within display text.
- `--nm-font-body` — **Inter** (400/500/600). Everything else: body copy,
  UI labels, nav.
- `--nm-font-mono` — **JetBrains Mono** (400/500). Data, numbers, code,
  keyboard hints, indexes (`01 /TOOLS`), metadata.

Rules:

- **All numbers in data are mono with `tabular-nums`.** Prices, context
  windows, benchmark scores, dates, counts. Use the `nm-num` helper class or
  `font-mono tabular-nums`.
- Instrument Serif is never used for body copy, buttons, or tables.
- Nav indexes, file paths, and slugs are mono.

## Components

Inventory — will grow as components are built. Status: **stub**.

- `VerdictBadge` — verdict chip (ship / situational / skip), semantic colors.
- `ShiftArrow` — momentum indicator (blueshift ↗ / steady → / redshift ↘).
- `ToolCard` — catalog card for a tool entry.
- `ModelTable` — dense models comparison table.
- `SectionHeader` — mono-indexed section heading (`01 /TOOLS` style).
- `KbdHint` — keyboard shortcut hint (`⌘K` etc.), mono.
- `CommandPalette` — global search/navigation overlay.

## Motion

Motion is zoned by page level. Use durations `--nm-dur-1` (80ms),
`--nm-dur-2` (160ms), `--nm-dur-3` (320ms) and easing
`--nm-ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`.

- **L0 — home page: full motion.** Three.js sky, GSAP sequences. This is
  the only place heavy animation lives.
- **L1 — catalog views: medium.** Hover transitions, filter transitions,
  reveal-on-scroll. 160–320ms.
- **L2 — tables and long-form text: micro.** 80–200ms state changes only.
  No parallax, no scroll-jacking.

`prefers-reduced-motion` must collapse everything to L2 micro transitions.

## FORBIDDEN

- **Purple/blue-violet gradients.** The "AI slop" marker. Any indigo-to-purple
  or violet gradient is an instant reject in review.
- **Glassmorphism blur** (`backdrop-filter: blur`, frosted panels).
- **Emoji in the UI.** Icons are SVG or typographic marks only.
- **Border radii above 16px.** Only 2 / 8 / 16 exist. No pill buttons.
- **Raw hex outside `tokens.css`.** Including inline styles and SVG fills.
- **`!important`.** Fix specificity properly.
- **Autoplaying audio.** Ever.
