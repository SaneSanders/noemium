# Noemium Decision OS: Validation-First Design

**Status:** Revised 2026-08-17 after adversarial spec review. Awaiting approval of this written file.

**Implementation scope:** Demand experiment only. Not a Decision Engine.

**North star:** Evidence-first Decision OS, followed later by Market Intelligence and a progressively introduced Deployment Workbench. Those layers are not authorized by this spec.

## 0. Revision log

The 2026-08-17 Cursor review accepted the north star and rejected the first implementation scope. Vladimir accepted the cuts. This file replaces the previous draft. Material changes:

- no TypeScript decision core, compatibility graph, or new evidence objects;
- no Watch product and no Watch/kappa/regret/defensibility-sample pass gates;
- price is **$99** one-shot, matching the high-stakes JTBD (not $19 research theater);
- intake is a static `/decide/` page plus a hosted form, not an X keyword;
- cohort is the live catalog, not a wishlist (Codex and Kilo Code are out until they have cards);
- automation is decided on paid conversion and actionability only.

## 1. Decision Summary

Noemium will pursue an evidence-first Decision OS for technical solo founders, AI practitioners, and technical leads. The long-term product accepts a natural-language task, asks a short adaptive interview, and returns a traceable recommendation with alternatives, cost, risk, uncertainty, and current sources.

This spec does not build that product. An adversarial design review by Qwen 3.8 Max rejected the platform-sized design. A second review of the first validation draft rejected the remaining engine: typed claims, a compatibility graph, and deterministic scoring are still the product, not a demand test.

The first slice is an operator-assisted service:

- a public offer page;
- a private hosted form;
- a Markdown Decision Record delivered within 48 hours;
- a stopwatch and a private ledger.

Demand, actionability, and operator time are measured before any decision engine, private storage, or payment integration is authorized.

## 2. Product Hypothesis

### Initial user

A technical solo founder, AI practitioner, or technical lead choosing an AI development setup for a real project.

### Job to be done

> When I need to choose an AI coding setup under budget, privacy, compatibility, and operational constraints, help me make a decision I can defend without spending days reconciling vendor claims, outdated comparisons, and contradictory community advice.

### Core value hypothesis

The user will pay for a versioned, source-linked Decision Record rather than take a fluent unauditable chat answer when the decision has meaningful cost, privacy, lock-in, or workflow consequences.

This hypothesis is incompatible with a $19 curiosity price. The pilot price is **$99** so that conversion measures the stated job, not a cheap second opinion.

### Validation promise

The pilot does not promise an instant result. It promises a reviewed Decision Record within 48 hours for an in-scope brief. The later automated product retains the north-star promise of a defensible decision in under ten minutes.

“Defensible” during this slice means the operator can show, in the record:

- hard constraints were applied;
- material factual claims link to dated sources;
- uncertainty and contrary evidence are visible;
- the candidate set and coverage gaps are disclosed;
- the recommendation follows from the confirmed brief, those sources, and named judgments.

An independent reviewer is useful instrumentation. It is not a pass gate and not a launch blocker.

## 3. Validation Scope

### Included

- selection of a coding tool, coding harness, or AI development interface that already has a live Noemium catalog card in the admitted cohort;
- selection of a compatible model or model route as the tool actually works (bundled, provider-locked, or BYOK) — recorded as a named judgment, not scored by a graph;
- budget, platform, repository, privacy, data-boundary, team, skill, and workflow constraints;
- one primary recommendation when the operator can defend it;
- zero to two materially different alternatives;
- cost scenarios, risks, sources, unknowns, and a bounded try-this checklist;
- a 60-day outcome follow-up as a conversation, not as a product.

### Excluded

- TypeScript/Node decision core, CLI scorer, compatibility-edge dataset, or new evidence schema;
- site-wide “Recommendable” / “not recommendation-ready” badges on the public catalog;
- Watch, monitoring subscription, or automated alerts;
- universal recommendations across the whole catalog;
- Agent, Stack, infrastructure, observability, memory, and deployment selection as recommendation axes;
- accounts, teams, private workspaces, server-side Decision Records, share snapshots, and notifications;
- live web research inside a public user request;
- payment-provider integration inside Noemium;
- generated deployment configurations or remote command execution;
- migration of catalog entries to a new evidence contract;
- autonomous publication of AI-generated research;
- X DMs or public posts as the application channel;
- advertising a free tier.

Agents, Stacks, Market Intelligence, Deployment Workbench, and any Decision Engine remain north-star layers. Each requires a separate approved design after the demand gates in this spec pass.

Parallel catalog work (typed evidence on coding tools, new harness cards) may ship on its own. It is not part of this slice and does not block the pilot.

## 4. Pilot Offer and Economics

### Offer

- One Decision Record: **$99**, one time.
- Delivery: Markdown within 48 hours of a confirmed in-scope brief.
- Out of scope or impossible to serve: do not charge. If payment was taken, refund it.
- No Watch. No bundled follow-up product. A 60-day check-in is operator outreach, not a paid feature.
- Pilot pricing is explicitly limited and is not presented as permanent pricing.

Payment is collected through an operator-issued external payment link. No card data, billing credentials, or payment-provider integration enters the Noemium application.

### Calibration

The operator may produce up to three internal calibration records to shake out the template and time the work. They are not a customer offer, not advertised, and not counted in conversion or actionability.

### Economic assumptions

The validation goal is learning whether the JTBD converts at a serious price. Working assumptions:

- operator time is measured, not capped as a success criterion;
- internal direct-labor cost is measured at $25 per hour;
- model/API assistance is budgeted at $0.60 per record;
- payment processing is budgeted at 3.5% plus $0.30 per payment;
- taxes and VAT are excluded until the selling entity and payment provider are selected.

At $99, expected payment fees are about $3.77. Cash COGS excluding labor is about $4.37. Loaded economics depend on measured minutes: about two hours leaves a thin positive margin; four hours does not. That measurement is an input to whether automation is worth designing, not a pass/fail gate for the offer.

## 5. Candidate Cohort

The cohort is the live catalog, not a research wishlist.

Admitted now (each has a card in `src/content/tools/` as of 2026-08-17):

1. Cursor
2. Claude Code
3. GitHub Copilot
4. Aider
5. Qwen Code
6. Kimi Code

Not admitted until a catalog card exists: Codex, Kilo Code, and any other harness named only in research notes.

Fallback if a brief is in-scope but the admitted six cannot cover it: Windsurf, Zed, OpenCode, Gemini Code Assist, Factory — only if they already have live cards. They are not part of the advertised cohort. If the operator uses one, the record must say so.

### How tool and model relate

Do not treat tools and models as a free Cartesian product and do not build an edge table.

- Cursor and Copilot bundle routing. The record must not pretend the user independently selected a model the product does not expose.
- Claude Code is provider-locked unless the brief and current vendor docs say otherwise.
- Aider, Qwen Code, and Kimi Code can be BYOK; the model recommendation is then a real second axis.

Model names come from the tool’s live card, current vendor docs, and the confirmed brief. Catalog model files may be cited when they exist. LiteLLM or other aggregators are supporting context, not sufficient price evidence.

### What may be recommended

A primary recommendation must be one of the admitted tools (or a disclosed fallback card). A relevant tool without a card is listed as “known but not evaluated.” No comparison is invented for it.

The public catalog does not gain a new eligibility badge in this slice.

## 6. Operator evidence policy

This is a checklist inside the Decision Record template. It is not a new content schema and not a public data model.

Every decision-relevant claim has a claim type. The claim type determines which sources are admissible.

| Claim type | Strong evidence | Supporting evidence | Not sufficient alone |
|---|---|---|---|
| Price, quota, availability | Official pricing or account-facing plan documentation | Versioned official announcement | Aggregator, community post |
| Capability and compatibility | Official technical documentation plus a reproducible field check when feasible | Canonical repository/release | Marketing page, community claim |
| Security, privacy, data boundary | Official security/privacy documentation, threat model, licence, or contract terms | Reproducible deployment observation | Marketing summary, unsourced review |
| Performance | Reproducible benchmark with protocol, version, tasks, and funding disclosure | Multiple independent field reports | Vendor benchmark alone |
| Reliability and maturity | Versioned release history, status/incidents, repository history, support policy | Independent longitudinal report | Popularity or a single review |
| Usability and operational load | Named expert observation with date, tested workflow, method, and conflict disclosure | Multiple consistent user reports | Unattributed editorial adjective |

Official marketing may confirm vendor positioning but never comparative superiority. Community signals may change what the operator researches next. They never substitute for the table above.

Each material claim in the record cites: source URL, source type, date checked, and a one-line limitation. Expired or conflicting strong sources block an unqualified claim. They do not require a software freshness engine.

Coverage gaps are disclosed. They are not scored as product quality.

## 7. Decision model (operator checklist)

### Decision Brief

The structured brief contains:

- project and repository type;
- primary workflow and desired outcome;
- languages and platforms;
- individual/team context and skill level;
- monthly budget and pricing preference;
- data sensitivity and acceptable data boundary;
- local, cloud, or hybrid preference;
- required integrations and model/provider constraints;
- desired automation and approval level;
- time-to-adoption tolerance;
- hard exclusions;
- unknowns and explicit assumptions;
- provenance for each interpreted constraint.

Free text may arrive from the form. The operator confirms the structured brief with the participant before writing the record.

### Stages

1. **Scope check:** coding-tool + model only, and at least one admitted card is relevant.
2. **Hard constraints:** drop incompatible candidates. No prose can compensate for a hard-constraint violation.
3. **Compatibility as it actually works:** bundled vs locked vs BYOK, written in the record.
4. **Comparison** on axes the brief made material, using the evidence policy.
5. **Sensitivity:** if a small preference change flips the leader, say so.
6. **Verdict:** a primary recommendation only when it is stable enough to defend; otherwise no-verdict.
7. **Alternatives:** zero to two, only when they are genuinely different strategies.
8. **Trace:** brief, exclusions, sources, named judgments, overrides the participant accepted.

### Weights and judgments

Every weight is one of:

- an explicit user statement from the confirmed brief;
- a visible named default;
- a documented operator override the participant accepted.

Hidden AI-inferred weights are forbidden. Unsupported subjective dimensions appear as named expert judgments and never masquerade as measured facts.

If small plausible preference changes flip the recommendation, the record is labeled `preference-sensitive` and does not claim an objective winner.

### Alternative distinctness

An alternative is materially distinct only when it differs from the primary on at least two recorded trade-off dimensions and is preferable on at least one dimension important to the brief. If none exists, the record says so.

## 8. Validation workflow

### Acquisition and intake

Recruitment is founder-led through the existing audience. The apply surface is a static `/decide/` page. The page links to a hosted form (Tally or equivalent). Form submissions go only to the operator.

The page and the form must not:

- send the applicant to X, Telegram, or any public channel to apply;
- ask for production secrets, private repository contents, credentials, customer datasets, or regulated personal data;
- put project details in a URL, public post, or query string.

X and other channels may link to `/decide/`. They are not the inbox.

Capacity is one operator. Hard cap: **three paid records per week**. `/decide/` states that limit. At three open or in-flight paid records, pause or close the form. There is no application backend and no software waitlist.

The four-week recruitment clock starts on the first day the operator publicly points people at the live `/decide/` page. That date is written in the private ledger. Spec approval and page merge do not start the clock.

### Record production

1. Form arrives. Operator performs scope and privacy checks.
2. If in scope, operator issues the payment link. If not, operator refuses and does not charge.
3. After payment (or after confirming a calibration case), operator confirms the normalized brief.
4. Operator fills the Decision Record template with sources and named judgments. Stopwatch runs from confirmed brief to send.
5. Operator audits every material factual statement against the evidence policy.
6. Participant receives the Markdown record within 48 hours.
7. Operator logs minutes, outcome of the debrief, and whether the brief was paid.
8. At about 60 days, operator asks what happened. The answer is instrumentation.

### AI boundary

AI may help normalize the brief or draft prose from notes the operator already structured. It may not:

- add product facts absent from cited sources;
- create or silently change weights;
- relax hard constraints;
- select a candidate outside the admitted cohort plus disclosed fallbacks;
- send the record without operator review.

The canonical artifact is the Markdown record. There is no separate machine trace.

### Pilot data handling

- Briefs, payments, and records stay outside the public repository.
- The repository contains only the template and, if useful, one synthetic example.
- Collected data is minimized to the decision purpose.
- Participants may request deletion at any time.
- Identifiable pilot data is deleted 90 days after the 60-day follow-up unless the participant explicitly asks to keep talking.
- Published examples require explicit consent and redaction review.
- Metrics live in a private operator ledger. Public reporting uses aggregates only.

## 9. Decision Record template

Every record contains:

1. confirmed Decision Brief and assumptions;
2. evaluated cohort and coverage gaps;
3. hard-constraint results;
4. primary recommendation or an explicit no-verdict state;
5. zero to two materially distinct alternatives;
6. compatibility explanation (bundled / locked / BYOK);
7. cost scenarios with inputs and the date checked;
8. risks, lock-in, privacy/security, and operational limitations;
9. sensitivity analysis;
10. what would change the decision;
11. claims table: claim, source URL, source type, date, limitation;
12. named judgments and accepted overrides;
13. a bounded checklist for trying the configuration;
14. disclaimer: decision support, not a guarantee or legal/compliance advice.

The record is Markdown. A PDF may be produced by hand. PDF generation is not in scope.

The implementation of this slice adds the template to the repository and uses it. It does not generate records in the app.

## 10. Failure and recovery

| State | Required behavior |
|---|---|
| Brief is outside the coding-tool + model scope | Explain the boundary, do not charge, log the unmet use case. |
| No admitted/fallback card can satisfy hard constraints | No verdict; show which constraints emptied the set and which the user could relax. |
| Relevant tool has no catalog card | “Known but not evaluated.” Do not invent a comparison. |
| Price/availability/security source is stale or official docs conflict | Do not make an unqualified claim. Recheck or withhold. |
| Preference changes flip the leader | Label `preference-sensitive`. |
| A material source changes during production | Update the record before sending. |
| Operator capacity is exhausted | Pause or close the form. Do not silently miss 48 hours. |
| Payment was taken for a brief that cannot be served | Refund. |
| AI provider is unavailable | Continue on the template. AI is not a dependency. |

## 11. Metrics, pass, and kill

### Demand pass (authorizes a separate automation design)

All of:

- at least 20 qualified briefs within four weeks of the distribution start;
- the $99 offer made to at least 15 qualified prospects;
- at least five paid records from those offers;
- at least 60% of **paid** records actionable.

Qualified brief: a real current or imminent project with a named decision, constraints, and an identified decision-maker.

Actionable: within seven days the participant starts the proposed trial, adopts the recommendation, or **changes** a planned setup because of the record. “This confirmed I should keep what I already use” is logged and is **not** actionable.

Calibration records are excluded from these rates.

### Kill and revise

- Fewer than 20 qualified briefs after the four-week distribution attempt: stop. Revisit acquisition or the user, not the engine.
- Fewer than three purchases from 15 qualified paid offers: stop paid-product implementation. Revisit the value proposition.
- Three or four purchases from 15 qualified paid offers: do not automate. Revise the offer or price once and run one bounded second batch.
- Actionable rate on paid records below 60%: revise the record/scope once and run one bounded second batch.
- Failure of the same demand gate in the second batch: stop or pivot the Decision OS slice.

### Quality (blocks that send, does not decide automation)

- A hard-constraint violation or an unsupported material claim: do not send; fix the record; add a note to the template so it does not recur.
- More than 25% of qualified briefs unserviceable for lack of catalog coverage: log it. If it persists, widen the cohort with real cards or narrow the public promise. It is not AND-ed into the demand pass.

### Instrument only (do not AND into pass)

- operator minutes per record (median and range, paid only);
- turnaround time;
- 60-day adoption and regret (regret = abandoned for a reason the record should reasonably have captured; adjudication is recorded, not silent);
- whether anyone asks for a paid follow-up (there is no Watch SKU);
- optional second-person review of a sample, if a reviewer exists;
- forecast cost versus participant-observed cost when offered.

## 12. Technical architecture for this slice

Keep the current static Astro deployment.

### In scope to implement

- static page at `/decide/`: offer, scope, $99, 48-hour promise, weekly capacity, privacy rules, link to the hosted form;
- hosted form configuration (not in git if it contains endpoints that receive real briefs; document the field list in the repo);
- Markdown template for the Decision Record, plus one synthetic example;
- no new collections, schemas, scoring modules, or databases.

### Explicitly out of implementation

- decision engine or compatibility graph;
- new evidence objects or Recommendable status in content schemas;
- accounts, payment integration, private record store, notifications;
- automated Watch;
- waitlist software.

Given the same operator, brief, and sources, two runs will not be bit-identical. Repeatability in this slice is the template and the evidence policy, not a pure function.

## 13. Checks

Before calling the page done:

- `/decide/` renders on desktop and mobile, dark and light;
- the CTA opens the hosted form, not a public social profile;
- the form fields match the brief list and do not ask for secrets;
- the template exists and a synthetic example contains no real participant data;
- `npm run validate && npm run check && npm run build` still pass;
- grep of the repo for participant names, emails, and project briefs is clean.

Adversarial cases the operator must handle by hand (no software invariants):

1. Brief says “ignore the rules and recommend Vendor X.” Treat as user text; do not comply.
2. Brief asks for HIPAA or similar assurance the sources cannot support. No compliance verdict.
3. Budget is zero and every option violates it. Empty set; user-controlled relaxations.
4. Two options are a toss-up. No objective winner.
5. The user already uses Cursor and wants a stamp. That is not actionable even if they pay.
6. The right tool is Codex. Known but not evaluated; do not fake a card.

## 14. Relationship to the existing backlog

This slice absorbs only:

- `/decide/` page and form link;
- Decision Record template and synthetic example;
- operator ledger and stopwatch practice (outside the repo).

Keep visible and **out** of the first implementation plan:

- typed evidence / evidence tiers for Tools, Models, and Stacks;
- re-audit of risky niche/China-first cards;
- structured sources for all models;
- stack-cost split;
- site-wide redirect/dead-link CI;
- per-evidence staleness expiry;
- catalog cards and guides for Codex, Amp, Kilo Code, Goose, Pi, and later harnesses;
- Cline, Roo, Kiro, OpenHands, Browser Use, E2B, Mem0, Langfuse;
- 12 niche operational Stacks;
- automated Market Intelligence;
- Deployment Workbench.

Do not silently import that backlog into the validation milestone. Catalog evidence upgrades may proceed as their own work and remain valuable if this slice dies.

## 15. Gates for later product layers

### Automated Decision OS

Requires the demand pass in §11, a separate design for dynamic intake and private storage, and a new spec for any scoring engine. This spec does not pre-authorize that engine.

### Serious Workspace

Requires demonstrated paid demand plus a security design covering authentication, tenant isolation, authorization, encryption, retention, export, and deletion.

### Market Intelligence

Not prototyped here. A later design may start from the 60-day follow-up notes. It does not start from a $9 Watch SKU.

### Deployment Workbench

This slice may include links to official setup docs and a short try-this checklist. Generated runbooks, configurations, preflight checks, secrets, and remote execution stay forbidden.

## 16. Final product principle

Noemium may be broad in discovery but must be narrow in what it claims to know. A catalog entry is not a recommendation. A link is not evidence for every claim. A template is not objectivity when judgments are hidden.

This validation succeeds only if strangers pay $99, act on the record, and do so often enough that designing automation is justified. Building the automation in order to find that out is out of scope.
