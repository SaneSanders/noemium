# Contributing to Noemium

Every entry in this directory is a pull request. If you have real,
hands-on experience with an AI tool, operational agent, skill, stack or model, you can add it in
about 5 minutes.

The catalog is two layers. **Radar** is an index card from primary docs — no
`ship` / `situational` / `skip`. **Floor** is a graded card (and, when we have
it, a short install/cost/security guide). Do not invent a verdict to fill the
index. Skills live at `/skills/`, not as a 13th tool category. Do not scrape
skills.sh or TAAFT into YAML.

## Submit a tool (or agent, skill, stack, or model)

1. **Fork** this repository.
2. **Copy the example** for the collection you're adding to:
   - `src/content/tools/cursor.yaml` (graded) or `src/content/tools/continue-dev.yaml` (radar)
   - `src/content/agents/grok-bot.yaml`
   - `src/content/skills/superpowers.yaml`
   - `src/content/stacks/solo-founder-saas.md`
   - `src/content/models/claude-sonnet-5.yaml`
3. **Rename** it to a kebab-case slug (`my-tool.yaml`).
4. **Fill it in** from your own experience (see the rules below). Radar
   listings may use the vendor homepage plus GitHub as fact receipts — that
   still does not justify a verdict.
5. **Validate locally:**

   ```sh
   npm install
   npm run validate
   ```

6. **Open a PR.** The same validation runs in review.

## The rules

- **Verdicts come from real use.** `ship`, `situational` or `skip` must
  reflect something you actually built or ran, not marketing pages. Radar
  cards must omit `verdict`, `verdict_text`, and `guide`.
- **Evidence tiers are binding on tools, agents, and skills.**
  `field-tested` and `source-verified` entries need a verdict. `radar` is
  discovery-only: no verdict and no hard cost scenario. Agent guides also
  need typed primary evidence for availability, installation, requirements,
  pricing, security, and license when applicable.
- **At least one receipt.** A receipt is a link that backs a claim. Two
  kinds count:
  - *Fact evidence* — official docs, pricing pages, GitHub repos, model
    cards. These support objective fields (price, context window, license).
  - *Experience evidence* — a project you shipped with it, a benchmark run,
    a screenshot. These support the verdict.
  For new contributions at least one receipt is required, and the verdict
  itself must come from real use — fact links alone can't justify a
  `ship`/`skip` call. No receipt, no merge.
- **Honest limitations.** `limitations` is a required field with named,
  specific downsides. "None" is not a limitation.
- **Optional briefing.** Flagship cards may add `strengths`, `use_for` and
  `skip_when` together (all three, or none). Named jobs, not slogans.
- **Affiliate links are always declared.** If your `url` or `receipts`
  contain referral or tracking parameters (`?ref=`, `?via=`, `?aff=`,
  `utm_*`), set `affiliate: declared`. The validator fails undeclared
  tracking links.
- **Self-promotion is allowed** — with the same bar as everything else:
  real receipts and honest limitations.
- **Vendors can challenge a verdict.** Open a
  [Vendor challenge](https://github.com/SaneSanders/noemium/issues/new?template=vendor-challenge.md)
  issue with primary evidence — docs, pricing pages, benchmarks, model cards,
  not marketing copy. The resolution is also a public PR; everything is auditable.
- **`last_verified`** is the date you last confirmed the entry is accurate
  (YYYY-MM-DD). Entries older than 90 days get flagged for re-verification.
- **`observed_by`** is your GitHub handle. You sign your observation.

## License

By contributing content you agree to license it under
[CC BY 4.0](LICENSE-CONTENT). Code contributions are
[MIT](LICENSE).

## Design and code

If you're touching UI, read [DESIGN.md](DESIGN.md) first — it is the design
law of the project (tokens only, no gradients, no emoji in UI). Before
opening a PR, run:

```sh
npm run validate && npm run check && npm run build && npm test && npm run test:dist
```
