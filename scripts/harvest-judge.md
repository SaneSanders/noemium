# Harvest judgement

Harvest observes. It does not patch the catalog.

## Run

```sh
npm run harvest              # all enabled kinds → reports/harvest/
npm run harvest -- --kind github,status
npm run harvest:brief        # markdown from latest.json
npm run world-status         # refresh src/data/world-status.json
```

Reports land in `reports/harvest/` (`latest.md`, `latest.json`). That
directory is gitignored.

GitHub Actions (Mondays 08:00 UTC) runs the same collectors, uploads the
artifact, and updates a single rolling issue, `harvest: world watch`.
Actions never commit catalog YAML. Judgement stays local. No paid API keys.

## Judge

Read `reports/harvest/latest.md` (and the JSON next to it if a line is thin).

You are judging observations, not applying them.

- Open the primary URL before touching YAML.
- Never bump `last_verified` on a card you did not re-check.
- Never change a verdict from a harvest finding. Verdicts need real use.
- Facts that may become a patch after the vendor page confirms them: price, context window, dead URL, archived repo, retiring date, graveyard candidate.
- Status findings are vendor-level (CDN outage ≠ a product). GitHub info is minor/major only — patch trains are not catalog events.
- `src/data/world-status.json` is a derived snapshot, not a judgement. Deploy refreshes it before build. Do not hand-edit incidents.
- RSS case studies and tutorials are already dropped. Remaining RSS is still not a patch until the vendor page confirms a field.
- Do not run judgement in GitHub Actions. No paid API keys. Budget is zero.
- Result is a content PR against `main`. Merge publishes.

Model price drift: open the vendor pricing page. If the number is real, you may run `npm run fetch-models` locally and review the diff. That script writes `last_verified` — keep the bump only for models you actually checked.
