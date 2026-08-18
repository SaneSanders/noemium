# Noemium Project Memory

Last updated: 2026-08-18 ~19:05 MSK (204-tool catalog on prod; UI kits stay on the default shelf; `/decide` stays local)

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

Long-term architecture remains an evidence-first Decision Graph plus a
reproducible Decision Engine. That architecture is **not** the first
implementation. A Decision Engine is unauthorized until the demand gates in
the validation spec pass.

## Validation-First Correction

Qwen 3.8 Max rejected the platform-sized design (NO-GO) and allowed a narrow
slice (CONDITIONAL GO). A second review of the written validation spec
rejected the remaining engine-before-demand design. Vladimir accepted those
cuts on 2026-08-17.

The first slice is an operator-assisted demand experiment for:

> **coding tool/harness + compatible model route**

It is not a scoring CLI, compatibility graph, or new evidence schema.

Agents, Stacks, automated Market Intelligence, accounts, teams, dynamic
private workspaces, payment integration, generated deployment configurations,
remote execution, Watch, and site-wide Recommendable badges are out of this
slice.

Durable reasons:

- demand must be proven before building a decision engine;
- comparative evidence can be a template policy before it is a data model;
- editorial time must be measured with a stopwatch, not assumed in software;
- Noemium must prove that users pay for an auditable record rather than a
  chat answer — at a price that matches a high-stakes job.

## Pilot Offer

- **$99** one time for one Decision Record, delivered as Markdown within 48
  hours;
- no Watch SKU, no bundled month of monitoring, no $19 price;
- no advertised free tier;
- up to three internal calibration records, not counted in demand metrics;
- payment via an operator-issued external link only.

$99 exists to test the stated JTBD. $19 would have tested a cheap second
opinion.

Working labor assumption for bookkeeping is $25/hour. Operator minutes are
instrumented. They are not a pass gate. Loaded margin at $99 is positive only
if the work stays near ~two hours; that is a learning input for automation,
not a claim.

## Cohort

Live catalog cards only:

- Cursor, Claude Code, GitHub Copilot, Aider, Qwen Code, Kimi Code.

Codex (`openai-codex`) and Kilo Code (`kilo-code`) have catalog cards as of
2026-08-18 wave A. They can enter the cohort after a field pass; “no card”
is no longer the blocker. Tool × model is not a Cartesian product:
Cursor/Copilot bundle routing; Claude Code is provider-locked unless current
docs say otherwise; Aider/Qwen/Kimi can be BYOK.

## Intake

Static `/decide/` plus a hosted form (Tally or equivalent). X is not the
inbox. No public project text, no secrets in the form. Cap: three paid
records per week; pause the form when full. The four-week recruitment clock
starts on first public pointer to live `/decide/`, not on spec approval.

## Validation Gates

Demand pass (authorizes a *separate* automation design, not this spec’s
engine):

- ≥20 qualified briefs in four weeks of distribution;
- $99 offered to ≥15 qualified prospects;
- ≥5 paid from those offers;
- ≥60% of **paid** records actionable.

Actionable does **not** include “this confirmed I should keep my current
setup.”

Kill: <20 briefs, or <3 paid of 15. Revise once at 3–4 paid of 15, or if
paid actionable rate <60%. Same gate failing twice stops or pivots the slice.

Watch continuation, Cohen’s kappa, 20-record mixed samples, 60-day regret,
and a 60-minute production cap are **not** pass gates. Instrument some of
them. Do not AND them.

## Catalog scope (2026-08-18)

The site is **not AI-only**. It is tools *and* tools for working with AI
(UI kits, icon sets, galleries, builders). Vladimir: we add cards, we do not
subtract them. Do not hide catalog entries behind a “builder kit” / non-AI
filter. That hide shipped, design dropped 29→8, and was reverted in `613dbad`.

Agent Skills are a different object (`SKILL.md`), not a 13th `/tools`
category. If built later: a separate `/skills` hub (12–15 curated cards), not
a scrape of skills.sh. Not before/during the Product Hunt slot.

## Existing Product and Architecture

- The application repository is `/Users/vladimir/projects/noemium/app`.
- Noemium is currently a mostly static Astro site with version-controlled
  YAML/Markdown content and schema validation.
- Production deploy is GitHub Actions build followed by `rsync` of `dist/` to
  Vultr.
- The live site already includes Tools, Models, Stacks, Compare, quiz
  (permalink `/quiz/<stack>/`), alternatives, `/about`, `/method`, changelog,
  graveyard, stale/adopt-a-page, price history, RSS, search, `llms.txt`,
  JSON dumps (`/api/tools.json`), and the Agent Field Guide. Default catalog
  shows all 204 tools including design kits.
- Grok Bot and Grok Build are distinct products. Grok Bot is at
  `https://noemium.com/agents/grok-bot/`; the Agent Field Guide is at
  `https://noemium.com/agents/`.
- Agents already have typed evidence. Tools still use `receipts`. Lifting
  agent evidence onto coding tools is catalog work, not this slice.
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

## Written Design

Source of truth for the first slice:

[`docs/superpowers/specs/2026-08-17-decision-os-validation-design.md`](docs/superpowers/specs/2026-08-17-decision-os-validation-design.md)

Implemented locally 2026-08-17 (`/decide/` + form + template). 2026-08-18: catalog/launch push authorized; keep `/decide` off production until inbox (Web3Forms) and payment link are wired and Vladimir explicitly asks to ship the offer.
