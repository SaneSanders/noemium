# Noemium

[![CI](https://github.com/SaneSanders/noemium/actions/workflows/ci.yml/badge.svg)](https://github.com/SaneSanders/noemium/actions/workflows/ci.yml)

![Noemium — pick AI tools without getting played](.github/hero.png)

**Pick AI tools without getting played.**

AI directories are pay-to-list. [Noemium](https://noemium.com) is open
source. Every recommendation is a PR you can audit. Receipts where we
print a number.

Noemium is a hub for AI practitioners:

- **Tools** — honest verdicts (`ship` / `situational` / `skip`) with named
  limitations, evidence links, and a decision briefing
  (`strengths` / `use_for` / `skip_when`) on flagship cards.
- **Agents** — operational field guides with install paths, requirements, cost
  scenarios, security boundaries, and explicit evidence tiers. Grok Bot and
  Grok Build are treated as separate products.
- **Stacks** — copy-pasteable recipes: which tools combined, at what monthly
  cost, for which use case.
- **Models** — context windows, per-MTok pricing, strengths and anti-use
  cases, with attributed sources.

Every entry carries `last_verified` and an `observed_by` GitHub handle. Tool
and stack entries require at least one receipt; agents declare typed evidence
tiers (`field-tested` / `source-verified` / `radar`). Affiliate links, when
they exist, are always declared.

## The site

Beyond the catalog indexes, [noemium.com](https://noemium.com) ships:

- [`/status`](https://noemium.com/status/) — build-time catalog health:
  briefing and receipt coverage, no vanity counters.
- [`/verified`](https://noemium.com/verified/) — the field-tested shelf.
  Empty until earned.
- [`/refusals`](https://noemium.com/refusals/) — a public ledger of declined
  paid placements. Zero so far, and that zero is the point.
- [`/kit`](https://noemium.com/kit/) — save and share tool sets via URL.
  No account, no fake totals.
- [`/changelog`](https://noemium.com/changelog/) — a weekly diff of what
  changed in the catalog.
- [`/graveyard`](https://noemium.com/graveyard/) — dead tools, with
  obituaries.
- [`/why`](https://noemium.com/why/) and
  [`/method`](https://noemium.com/method/) — the essay and the verification
  method.
- 45 static `X vs Y` comparison pages, a Pagefind search, and a five-question
  quiz that ends in a stack.

## Open data

- `/api/tools.json`, `/api/stacks.json`, `/api/models.json` — full dumps.
- `/tools/<slug>.json` — every tool as its own JSON endpoint.
- `/llms.txt` and `/llms-full.txt` — the catalog, LLM-ready.

## Stack

- [Astro](https://astro.build) (static output) + Preact islands
- Tailwind CSS v4 (CSS-first config, "Bold Grid" design tokens)
- Content: Astro Content Collections (YAML + Markdown), zod-validated
- No WebGL/motion libraries — typographic hero, CSS-only motion

## Quick start

```sh
npm install
npm run dev        # http://localhost:4321
```

Other commands:

```sh
npm run build      # static build to dist/
npm run check      # astro check (types)
npm run validate   # validate all content entries (CI-friendly)
npm test           # unit tests (schemas, surfaces, kit, logos)
npm run test:dist  # dist assertions (run after build)
```

## Content structure

```
src/content/
├── tools/    # *.yaml — one file per tool (see cursor.yaml as template)
├── agents/   # *.yaml — strict field guides and verdict-free Radar entries
├── stacks/   # *.md   — frontmatter + recipe body (see solo-founder-saas.md)
├── models/   # *.yaml — one file per model (see gpt-5-6-sol.yaml)
└── graveyard/ # *.yaml — dead tools, with obituaries
```

Schemas live in `src/content-schemas.ts` and are enforced both at build
time and by `npm run validate`. Agent entries declare `field-tested`,
`source-verified`, or `radar`; Radar entries cannot carry verdicts or hard cost
scenarios.

## Contributing

Every entry is a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) — it
takes about 5 minutes to submit a tool.

Design decisions are governed by [DESIGN.md](DESIGN.md). Content is licensed
[CC BY 4.0](LICENSE-CONTENT); code is [MIT](LICENSE).
