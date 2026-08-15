# Contributing to Noemium

Every entry in this directory is a pull request. If you have real,
hands-on experience with an AI tool, stack or model, you can add it in
about 5 minutes.

## Submit a tool (or stack, or model)

1. **Fork** this repository.
2. **Copy the example** for the collection you're adding to:
   - `src/content/tools/cursor.yaml`
   - `src/content/stacks/solo-founder-saas.md`
   - `src/content/models/claude-sonnet-4-5.yaml`
3. **Rename** it to a kebab-case slug (`my-tool.yaml`).
4. **Fill it in** from your own experience (see the rules below).
5. **Validate locally:**

   ```sh
   npm install
   npm run validate
   ```

6. **Open a PR.** The same validation runs in review.

## The rules

- **Verdicts come from real use.** `ship`, `situational` or `skip` must
  reflect something you actually built or ran, not marketing pages.
- **At least one receipt.** `receipts` links to evidence: a project you
  shipped with it, a screenshot, a benchmark run. No receipt, no merge.
- **Honest limitations.** `limitations` is a required field with named,
  specific downsides. "None" is not a limitation.
- **Affiliate links are always declared.** If your `url` or `receipts`
  contain referral or tracking parameters (`?ref=`, `?via=`, `?aff=`,
  `utm_*`), set `affiliate: declared`. The validator fails undeclared
  tracking links.
- **Self-promotion is allowed** — with the same bar as everything else:
  real receipts and honest limitations.
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
npm run validate && npm run check && npm run build
```
