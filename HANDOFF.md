# Noemium Handoff

Checkpoint: 2026-08-17

State: deliberately paused before implementation planning

## Read First

1. Read [`MEMORY.md`](MEMORY.md) for durable decisions.
2. Read the written design spec awaiting final user approval:
   [`docs/superpowers/specs/2026-08-17-decision-os-validation-design.md`](docs/superpowers/specs/2026-08-17-decision-os-validation-design.md).
3. Do not start implementation or write an implementation plan until Vladimir
   explicitly approves the written spec in the new session.

## Exact Stop Point

The product architecture, Qwen adversarial review, validation-first correction,
pilot scope, and pilot pricing were discussed and approved conversationally.
The written spec was then created and self-reviewed. Vladimir said “стоп фрейм”
before approving the written file itself, and then explicitly requested this
memory + handoff checkpoint.

Therefore the next required user gate is:

> Ask Vladimir to review/approve the written validation design spec. If he
> approves it, invoke `superpowers:writing-plans` and create the detailed
> implementation plan. If he requests changes, edit the spec, repeat the
> placeholder/consistency/scope/ambiguity review, and commit the correction
> before asking again.

Do not invoke implementation skills before that approval. The brainstorming
workflow's next and only allowed transition is `superpowers:writing-plans`.

## Git and Deployment State

- Repository: `/Users/vladimir/projects/noemium/app`
- Branch: `main`
- Remote baseline: `origin/main` at production release commit `e81bf3c`
- Local design commit before this checkpoint: `fd8f374`
- `fd8f374` contains only the approved validation design spec.
- The branch was one commit ahead of `origin/main` before the memory/handoff
  checkpoint files were added and should be two commits ahead after their
  local checkpoint commit.
- Inspect the latest local commit with `git log -1 --oneline`; its hash is also
  reported in the checkpoint session's final response.
- Do not push or deploy these documentation commits without explicit user
  authorization.

## Last Production Release

Commit `e81bf3caa7d68f9ba4a3afb4c46f92c693804381` was committed, pushed,
deployed, and production-verified before product brainstorming began.

It includes:

- the catalog/current-information audit;
- Agent Field Guide;
- Grok Bot, Grok Build, OpenClaw, Hermes Agent, and Radar entries;
- navigation, search, RSS, `llms.txt`, changelog, homepage, contribution, and
  Open Graph integration.

Production checks passed for desktop/mobile layout, dark/light themes, command
palette, Agent pages, Grok Bot pricing/evidence, search index, `llms.txt`, and
broken-image/overflow checks. GitHub Actions validation and deployment both
succeeded.

## Current Product Decision

The first implementable project is not the full Decision OS. It is the
validation slice:

- user: technical solo founder / AI practitioner / technical lead;
- decision: coding tool/harness + compatible model route;
- first three records free;
- later pilot records $19;
- first month of manual Watch included;
- Watch $9/month;
- static `/decide/` pilot page points applicants to
  `https://x.com/whysanesanders` with keyword `PILOT`;
- operator-assisted Decision Record within 48 hours;
- no dynamic backend, accounts, payment integration, private web records,
  automated Watch, Agent/Stack scoring, or Workbench execution.

Seed research cohort and all pass/kill gates are specified in the design file.

## Qwen Review Outcome

The full design was sent through the installed Qwen CLI using confirmed model
ID `qwen3.8-max`, safe mode, no tools, and an isolated temporary working
directory. The first network call required approved external network access.
Qwen produced a long adversarial pre-mortem and then a compact complete edition.

Its verdict:

- original design: **NO-GO**;
- narrowed validation-first slice: **CONDITIONAL GO**.

The five blocking themes incorporated into the spec are:

1. insufficient recommendation-eligible breadth for four-axis decisions;
2. missing enforceable epistemology for comparative claims;
3. unmeasured editorial/revalidation capacity;
4. hidden platform-scale work before demand proof;
5. unproven differentiation and willingness to pay versus frontier chatbots.

No Qwen process edited project files.

## Existing Backlog Preserved Outside the First Slice

Do not lose or silently import these items into the first implementation plan:

1. typed evidence/evidence tiers for all Tools, Models, and Stacks;
2. re-audit of 16 risky niche/China-first cards;
3. structured sources for all 36 models;
4. stack-cost split into subscriptions, infrastructure, and usage;
5. site-wide redirect/dead-link CI;
6. per-evidence staleness expiry;
7. full guides for Codex, Amp, Kilo Code, Goose, and Pi;
8. later wave: Cline, Roo, Kiro, OpenHands, Browser Use, E2B, Mem0,
   Langfuse, and others;
9. 12 niche operational stacks;
10. conversion of the approved plan into a real GitHub backlog; there were zero
    open issues when last checked.

Only the subset needed for the admitted validation cohort belongs in the first
implementation plan.

## Operational Decisions Still External to the App

These are intentionally not implementation blockers for the static validation
slice, but must be supplied before running the live pilot:

- which external payment link/provider the operator uses;
- where the private pilot ledger and participant records live;
- who acts as the independent technical reviewer.

No payment credentials or participant data belong in the public repository.

## Current Plan Status

Completed:

- production release, push, deploy, and live verification;
- unfinished-roadmap inventory;
- primary user, outcome, input, and evidence-first mechanism decisions;
- architecture comparison and approval;
- full product design presentation;
- Qwen 3.8 Max adversarial review;
- validation-first revision and pricing approval;
- written design spec and self-review.

In progress:

- user review of the written spec.

Pending after explicit approval:

1. invoke `superpowers:writing-plans`;
2. write a detailed implementation plan for the validation slice only;
3. ask for plan review before implementation;
4. implement and verify in bounded batches;
5. create a real GitHub backlog only when authorized;
6. push/deploy only when explicitly authorized.

## Recommended First Message in the New Session

> Мы остановились перед implementation plan. Спека validation-first Decision
> OS находится в
> `docs/superpowers/specs/2026-08-17-decision-os-validation-design.md`.
> Подтверди письменную спеку или назови изменения; без этого реализацию не
> начинаю.
