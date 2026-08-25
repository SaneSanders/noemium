# Harvest judgement

Read `reports/harvest/latest.md` (and the JSON next to it if a line is thin).

You are judging observations, not applying them.

- Open the primary URL before touching YAML.
- Never bump `last_verified` on a card you did not re-check.
- Never change a verdict from a harvest finding. Verdicts need real use.
- Facts that may become a patch after the vendor page confirms them: price, context window, dead URL, archived repo, retiring date, graveyard candidate.
- Status findings are vendor-level (CDN outage ≠ VibeSDK). GitHub info is minor/major only — patch trains are not catalog events.
- RSS case studies and tutorials are already dropped. Remaining RSS is still not a patch until the vendor page confirms a field.
- Do not run judgement in GitHub Actions. No paid API keys. Budget is zero.
- Result is a content PR against `main`. Merge is Vladimir's. Merge publishes.

Model price drift: open the vendor pricing page. If the number is real, you may run `npm run fetch-models` locally and review the diff. That script writes `last_verified` — keep the bump only for models you actually checked.

Do not commit the Decide slice. Do not touch Nema or the Autopsy engine.
