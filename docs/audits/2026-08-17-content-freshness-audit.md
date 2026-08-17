# Noemium content freshness audit — 2026-08-17

## Executive result

The site is structurally healthy and builds cleanly, but it is not yet honest to
describe every catalog fact as equally “verified”. The main risk is evidence
quality, not broken rendering:

- 209 content entries: 157 tools, 36 models, 15 stacks, and 1 graveyard entry.
- 259 unique first-party and receipt URLs checked.
- 232 returned HTTP 200; the remaining responses were mostly bot protection.
- One genuine 404 and one genuine 410 were found and replaced.
- 112 of 157 tool entries still have only one receipt.
- 84 of 157 tool entries have no receipt deeper than a domain homepage.
- 29 of 36 model attributions contain no clickable source URL.
- Tool reviews are concentrated into three dates. A recent date therefore does
  not prove that every field was independently rechecked.

Conclusion: the current catalog is usable, but expansion must ship with a
stronger evidence model. Adding hundreds of entries to the existing binary
schema would compound trust debt.

### Post-audit implementation note

The approved agent expansion was implemented after this 209-entry baseline.
The repository now validates **223 entries**, including 14 entries in a
separate `/agents` collection. Four are source-verified operational guides
(Grok Bot, Grok Build, OpenClaw, and Hermes Agent); ten are explicitly
verdict-free Radar entries. The agent schema implements typed evidence,
evidence tiers, license semantics, deployment modes, cost scenarios, and
security boundaries without pretending the older tool/model collections have
already been migrated.

## What was checked

1. Content-schema validation for every tool, model, stack, and graveyard entry.
2. Astro type checking and a production build.
3. The live `https://noemium.com` response and published collection counts.
4. Every unique primary URL and receipt URL with redirects followed.
5. Receipt depth and primary-source coverage.
6. License semantics for entries presented as open source.
7. Canonical domains and product renames.
8. Generated price-history and weekly-changelog data.
9. Stack-cost arithmetic.
10. Public claims about model-data provenance.

## Structural health

| Gate | Result |
|---|---:|
| Content validation | pass, 209 entries, 0 warnings |
| Astro check | pass, 0 errors, 0 warnings |
| Production build | pass |
| Live homepage | HTTP 200 |
| Stack monthly-cost arithmetic | 15/15 exact |

The first build attempt was run concurrently with type checking and hit a Vite
temporary-directory rename race. A normal sequential build passed; this was a
test-run collision, not a product defect.

## Link audit

| Result bucket | Count | Interpretation |
|---|---:|---|
| HTTP 200 | 232 | healthy |
| HTTP 403 | 18 | bot/WAF rejection; not automatically broken |
| HTTP 429 | 3 | rate limited |
| HTTP 405 | 2 | method rejected |
| HTTP 404 | 1 | broken Sourcegraph Cody repository receipt |
| HTTP 410 | 1 | removed third-party Vidu review |
| Network failure | 2 | Play.ht graveyard target and a region-sensitive GLM page |

Canonical moves found during redirect checks:

- Tailwind UI → [Tailwind Plus](https://tailwindcss.com/plus)
- Origin UI → [COSS UI](https://coss.com/ui)
- CosyVoice → [QwenAudio/CosyVoice](https://github.com/QwenAudio/CosyVoice)
- `v0.dev` → [v0.app](https://v0.app)
- `notebooklm.google` → [notebook.google](https://notebook.google)
- `runwayml.com` → [runway.com](https://runway.com)
- `lambdalabs.com` → [lambda.ai](https://lambda.ai)
- Windsurf → [Devin Desktop](https://devin.ai)

## Evidence quality

### Tools

- 227 receipts across 157 entries.
- 112 entries have exactly one receipt.
- 84 entries have homepage-only receipts by URL-depth heuristic.
- A manual high-risk queue remains for China-first and niche entries whose
  prices are supported mainly by SEO aggregators or inaccessible regional
  consoles.

The first high-risk queue is: ByteDance Seed, CodeGeeX, CosyVoice, ERNIE API,
Hailuo AI, Hunyuan API, Hunyuan Video, Qwen API, Qwen Image, Seedance, StepFun
API, Tongyi Lingma, Vidu, Devin Desktop/Windsurf, and Yi API. Some now have an
official source, but their price and availability claims still need field-level
receipts.

### Models

The public Models page previously said all prices came from Helicone and
LiteLLM. That was inaccurate: the collection also contains vendor pages,
regional calculators, and explicitly unconfirmed secondary reports. The copy
now describes the mixed provenance and tells users to follow attribution before
billing decisions.

The schema still stores `source_attribution` as prose. Only 7 of 36 entries have
a clickable URL. This should become structured, typed receipts before the next
large model expansion.

### Stacks

All 15 displayed totals equal their line items. The weakness is semantic:
`monthly_cost_usd` combines fixed subscriptions with assumed API usage, while
most receipts point to homepages. A serious cost product needs explicit line
items, usage assumptions, and budget/standard/premium scenarios.

## Corrections applied

| Entry/surface | Correction |
|---|---|
| n8n | `open_source` changed to false; n8n describes the product as fair-code/source-available. |
| Inngest | `open_source` changed to false; current server/CLI uses SSPL with delayed Apache conversion. |
| Dify | presented as source-available, not OSI open source; license restrictions linked. |
| Model API services | Hosted ERNIE, GLM, Hunyuan, MiniMax, Qwen, StepFun, and Yi APIs no longer inherit `open_source`/`self_host` from separately released model weights. |
| Cody | dead GitHub receipt replaced with official Sourcegraph documentation. |
| Tailwind UI | renamed to Tailwind Plus and moved to the canonical product URL. |
| Origin UI | updated to COSS UI (formerly Origin UI), with the migration/legacy status stated. |
| CosyVoice | canonical repository changed to QwenAudio and added as a primary receipt. |
| Vidu | dead secondary sources removed; free allowance corrected from 80 to 40 monthly credits and official API pricing linked. |
| Canonical domains | v0, NotebookLM, Runway, Lambda, and Devin Desktop receipts/URLs updated. |
| Models page | provenance claim corrected from “Helicone + LiteLLM” to the actual mixed source set. |
| README | stale model-file example replaced. |
| Generated data | price history rebuilt from 33 to 36 models; changelog rebuilt from current content/git history. |

## P0 data-model problem

The booleans `open_source` and `self_host` cannot represent the current market.
At minimum, replace them with:

```yaml
license_kind: osi-open-source | open-weights | source-available | proprietary
deployment: local | self-hosted | managed | hybrid
self_host_scope: product | model-only | none
```

Every material claim should have a typed receipt:

```yaml
evidence:
  - kind: pricing | install | requirements | license | security | availability
    url: https://...
    checked_at: 2026-08-17
```

And every entry should declare its review depth:

```yaml
evidence_tier: field-tested | source-verified | radar
```

`field-tested` means Noemium actually installed or used the product.
`source-verified` means all displayed claims have current primary receipts.
`radar` is discoverable but cannot receive a Ship verdict or a global Verified
stamp.

## Recommended next audit order

1. Introduce typed evidence and evidence tiers before adding the agent wave.
2. Re-audit the 16 high-risk niche/China-first entries against primary sources.
3. Convert all 36 model attributions into structured receipts.
4. Split stack cost into subscription, infrastructure, and assumed usage.
5. Add an automated canonical-redirect and dead-link report to CI.
6. Add a stale policy per evidence kind, not one date for the whole card.
