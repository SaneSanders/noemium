# AGENTS.md

Noemium is an **open source hub about AI tools** — a catalog of tools,
copy-pasteable stacks, and model data, where every recommendation is an
auditable PR. The site is a static Astro build.

## Session continuity

`MEMORY.md` and `HANDOFF.md` are maintainer-local session-continuity files.
They are intentionally **not tracked** in the public repo (they can leak
internal strategy). For the maintainer's agents: before continuing work, read
`MEMORY.md` for durable decisions and `HANDOFF.md` for the exact current
checkpoint, and update both at meaningful stop points.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Project rules

- **Design law: [DESIGN.md](DESIGN.md).** All colors live only in
  `src/styles/tokens.css` (hex values are forbidden anywhere else). Tokens
  are mapped to Tailwind v4 utilities in `src/styles/theme.css`.
- **Content schemas** live in `src/content-schemas.ts` (plain zod, no Astro
  specifics) and are shared by `src/content.config.ts` and
  `scripts/validate-content.mjs`. Content entries live in
  `src/content/{tools,stacks,models}` — the existing entry in each folder is
  the template.
- **Before opening a PR**, all three gates must pass:

  ```sh
  npm run validate && npm run check && npm run build
  ```

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
