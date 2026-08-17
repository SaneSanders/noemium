# Noemium Project Memory

Last updated: 2026-08-17

This file contains durable decisions. For branch state and the exact next
action, read [`HANDOFF.md`](HANDOFF.md).

## Product Direction

The approved product hierarchy is:

1. **Decision OS** is the primary product direction now.
2. **AI Market Intelligence** is a strong second layer, added later.
3. **Agent Deployment Workbench** is a third layer, introduced gradually and
   only after separate product and security designs.

The initial Decision OS user is a technical solo founder, AI practitioner, or
technical lead. The long-term promise is a defensible recommendation in under
ten minutes from a natural-language task and a short adaptive interview.

The approved long-term architecture is an evidence-first Decision Graph plus a
reproducible Decision Engine:

- typed data and deterministic rules select and compare candidates;
- AI may interpret intent, ask questions, and explain a structured trace;
- AI may not invent product facts, silently change weights, relax hard
  constraints, or publish evidence changes autonomously;
- catalog presence and recommendation eligibility are separate;
- broad discovery is allowed, but only evidence-complete candidates may be
  Recommendable;
- every important weight, claim, source, cost assumption, and exclusion must
  have visible provenance.

## Validation-First Correction

Before implementation, the complete design was sent to the locally available
`qwen3.8-max` model for an adversarial pre-mortem. Qwen's verdict was:

- original platform-sized design: **NO-GO**;
- narrow validation slice: **CONDITIONAL GO**.

The founder accepted the correction. The approved first slice is only:

> **coding tool/harness + compatible model route**

Agents, Stacks, automated Market Intelligence, accounts, teams, dynamic private
workspaces, payment integration, generated deployment configurations, and
remote execution are not part of this first slice.

The durable reasons for validation-first are:

- comparative evidence must be proven before it is scaled;
- the recommendation-eligible cohort is initially too small for honest
  Tool + Model + Agent + Stack decisions;
- editorial/revalidation capacity must be measured rather than assumed;
- demand must be demonstrated before building a dynamic application platform;
- Noemium must prove that users value an auditable record more than a quick
  answer from a frontier chat model.

## Pilot Offer

The approved validation pricing is:

- first three Decision Records: free calibration records;
- subsequent pilot Decision Record: **$19 one time**;
- first month of manual Watch included;
- founding Watch renewal: **$9/month**.

This price is intentionally subsidized research pricing, not the assumed final
business model. Working economics use $25/hour direct labor, about $0.60 model
cost per record, and an assumed 3.5% + $0.30 payment fee. At one operator hour,
a $19 record has approximately -40% fully loaded margin; the ten-record pilot
has an expected research subsidy of roughly $75–100. The operator-time cap is
60 minutes after the first three calibration records.

Payment remains outside the application through an operator-issued payment
link. No payment credentials enter Noemium during validation.

## Validation Principles

- The pilot starts only after at least five coding tools/harnesses and five
  model routes pass the evidence contract.
- A tool-model pair must have an explicit compatibility edge; candidates are
  not combined as a free Cartesian product.
- Comparative claims follow a claim-type × source-type policy.
- Evidence coverage is a recommendation gate and warning, never a positive
  product-quality score.
- Community signals may affect the research queue but never scoring.
- Alternatives are optional; do not fill a three-card layout when no materially
  different alternative exists.
- A small weight change that flips the winner produces a
  `preference-sensitive` result, not false certainty.
- Known but insufficiently evaluated candidates must be disclosed.
- No participant brief, private record, secret, or identifying pilot ledger is
  committed to the public repository.
- Manual Watch is the validation prototype for later Market Intelligence.
- Setup links/checklists are the only Deployment Workbench-adjacent output
  allowed in validation.

## Validation Gates

The automation design is not authorized until the written specification's
gates pass. The central gates are:

- at least 20 qualified briefs in a four-week distribution attempt;
- the $19 offer made to at least 15 qualified prospects;
- at least five paid records and at least ten participant records completed;
- at least 60% actionable records;
- at least 80% defensible records in a 20-record independent review sample;
- median post-calibration production time no more than 60 operator minutes;
- at least 20% paid Watch continuation after the included month;
- 60-day regret no more than 30%;
- no hard-constraint violation or unsupported material structured claim;
- no more than 25% of qualified briefs unserviceable due to evidence coverage;
- reviewer agreement reaches Cohen's kappa of at least 0.60.

Three or four purchases trigger one bounded offer/price revision. Fewer than
three purchases from 15 qualified offers stops paid-product implementation.
Failure of a product/evidence gate may be revised once; repeating the failure
stops or pivots the slice.

## Existing Product and Architecture

- The application repository is `/Users/vladimir/projects/noemium/app`.
- Noemium is currently a mostly static Astro site with version-controlled
  YAML/Markdown content and schema validation.
- Production deploy is GitHub Actions build followed by `rsync` of `dist/` to
  Vultr.
- The live site already includes Tools, Models, Stacks, Compare, quiz,
  alternatives, guides, changelog, graveyard, stale/adopt-a-page, price
  history, RSS, search, `llms.txt`, and the Agent Field Guide.
- Grok Bot and Grok Build are distinct products. Grok Bot is at
  `https://noemium.com/agents/grok-bot/`; the Agent Field Guide is at
  `https://noemium.com/agents/`.
- Repository project rules remain in [`AGENTS.md`](AGENTS.md) and visual rules
  in [`DESIGN.md`](DESIGN.md).

## Delivery Rules

- Communicate with Vladimir in Russian, informal `ты`.
- Challenge undecided ideas with evidence. Once Vladimir makes a decision,
  execute it unless genuinely critical new evidence appears.
- Keep changes surgical and preserve unrelated work.
- Local commits are appropriate for complete, verified batches.
- Push, merge, production deployment, payment-provider changes, and other
  external actions require explicit authorization.
- Before claiming completion, run the relevant verification gates and inspect
  their output.

## Written Design Awaiting Final Review

The current written design, incorporating all conversationally approved
decisions, is:

[`docs/superpowers/specs/2026-08-17-decision-os-validation-design.md`](docs/superpowers/specs/2026-08-17-decision-os-validation-design.md)

Vladimir has not yet given the separate final approval of this written file.
After that approval it becomes the source of truth for the first validation
slice. Later product layers require their own design and implementation-plan
cycles.
