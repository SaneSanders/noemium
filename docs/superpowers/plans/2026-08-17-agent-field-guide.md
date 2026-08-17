# Agent Field Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate `/agents` product surface with typed evidence, four source-verified field guides, and a clearly separated niche Radar.

**Architecture:** Add an Astro content collection dedicated to operational agents and harnesses instead of expanding the overloaded tool category. One schema supports strict `field-tested`/`source-verified` guides and lower-confidence `radar` entries, with cross-field validation preventing Radar entries from receiving verdicts or unreceipted hard claims. Static index/detail pages render the same content into navigation, search, RSS, `llms.txt`, changelog links, and Open Graph images.

**Tech Stack:** Astro 7, TypeScript, Zod 4, YAML content, Preact command palette, Node.js built-in test runner.

**Status (2026-08-17): Complete.** All five tasks were implemented; automated gates and responsive browser QA passed. The checklists below preserve the original execution plan.

## Global Constraints

- Preserve the existing tool collection and its URLs; `/agents` is an additional editorial surface.
- `field-tested` and `source-verified` entries may have verdicts; `radar` entries may not.
- A strict guide must contain install, requirements, pricing, availability, and security evidence; non-proprietary guides also require license evidence.
- Every evidence URL must be absolute HTTPS and every evidence item carries `checked_at` in `YYYY-MM-DD` form.
- Grok Bot and Grok Build are separate products: Grok Bot is a managed work agent; Grok Build is a coding harness.
- Do not add raw hex colors, gradients, emoji UI, radii above 14px, or new animation libraries.
- Do not commit, push, or publish unless the user explicitly requests it.

---

### Task 1: Agent data contract

**Files:**
- Create: `tests/content-schemas.test.mjs`
- Modify: `src/content-schemas.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `agentSchema`, `agentLayers`, and inferred `Agent` type.
- `agentSchema` accepts strict guides with operational fields and lightweight Radar entries.

- [ ] **Step 1: Write the failing schema tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { agentSchema } from '../src/content-schemas.ts';

const strict = {
  name: 'Example Agent', vendor: 'Example', tagline: 'A test agent.',
  url: 'https://example.com', agent_layer: 'personal-agent', maturity: 'beta',
  license_kind: 'proprietary', evidence_tier: 'source-verified',
  summary: 'A complete source-verified fixture.', best_for: ['testing'],
  deployment: ['managed'], verdict: 'situational', verdict_text: 'Useful with caveats.',
  install: [{ method: 'web', platform: 'web', url: 'https://example.com/start' }],
  requirements: ['An account'], providers: ['Example Model'], channels: ['web'],
  cost_scenarios: [{ name: 'paid', monthly_usd_min: 20, monthly_usd_max: 20, assumptions: 'One seat.' }],
  security: { privilege: 'high', data_boundary: 'Vendor cloud', cautions: ['Use a separate account.'] },
  limitations: ['Beta software.'],
  evidence: ['install', 'requirements', 'pricing', 'security', 'availability'].map((kind) => ({ kind, url: 'https://example.com/docs', checked_at: '2026-08-17' })),
  last_verified: '2026-08-17', observed_by: 'tester',
};

test('accepts a fully receipted source-verified guide', () => {
  assert.equal(agentSchema.safeParse(strict).success, true);
});

test('rejects a strict guide missing security evidence', () => {
  const data = { ...strict, evidence: strict.evidence.filter((e) => e.kind !== 'security') };
  assert.equal(agentSchema.safeParse(data).success, false);
});

test('rejects a radar verdict', () => {
  const data = { ...strict, evidence_tier: 'radar', verdict: 'ship' };
  assert.equal(agentSchema.safeParse(data).success, false);
});

test('rejects a cost range whose maximum is below its minimum', () => {
  const data = { ...strict, cost_scenarios: [{ ...strict.cost_scenarios[0], monthly_usd_min: 30, monthly_usd_max: 20 }] };
  assert.equal(agentSchema.safeParse(data).success, false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/content-schemas.test.mjs`

Expected: FAIL because `agentSchema` is not exported.

- [ ] **Step 3: Implement the minimal Zod schema**

Add enums for agent layer, maturity, evidence tier, license kind, deployment, evidence kind, install method, and security privilege. Add `superRefine` rules for strict evidence coverage, Radar verdict exclusion, install method URL/command presence, cost-range ordering, and non-proprietary license evidence.

- [ ] **Step 4: Add the test script and verify GREEN**

Add `"test": "node --test tests/content-schemas.test.mjs tests/agent-content.test.mjs"` after Task 2 creates the second file. During this task run `node --test tests/content-schemas.test.mjs`.

Expected: 4 tests pass, 0 fail.

### Task 2: Collection, validator, and first admission wave

**Files:**
- Create: `tests/agent-content.test.mjs`
- Create: `src/content/agents/grok-bot.yaml`
- Create: `src/content/agents/grok-build.yaml`
- Create: `src/content/agents/openclaw.yaml`
- Create: `src/content/agents/hermes-agent.yaml`
- Create Radar YAML files for `nanoclaw`, `picoclaw`, `zeroclaw`, `nullclaw`, `deerflow`, `openfang`, `ironclaw`, `librefang`, `osa`, and `tinyagi`.
- Modify: `src/content.config.ts`
- Modify: `scripts/validate-content.mjs`

**Interfaces:**
- Produces: Astro collection `agents` and 14 validated entries.
- Strict guides expose all operational sections; Radar entries expose identity, discovery summary, deployment hypothesis, limitations, and availability evidence only.

- [ ] **Step 1: Write the failing content test**

The test loads all `src/content/agents/*.yaml` using `js-yaml`, validates each with `agentSchema`, asserts exactly four entries are `source-verified`, asserts at least ten are `radar`, and asserts `grok-bot.agent_layer === 'work-agent'` while `grok-build.agent_layer === 'coding-harness'`.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/agent-content.test.mjs`

Expected: FAIL because `src/content/agents` and the first admission wave do not exist.

- [ ] **Step 3: Add the collection and validator wiring**

Import `agentSchema` into `src/content.config.ts`, define the YAML glob collection, and add it to `collections`. Add `agents` to the standalone validator and include agent primary/evidence/install URLs in referral checks.

- [ ] **Step 4: Add four strict guides**

Use current first-party receipts for:

- Grok Bot: `https://x.ai/bot`, managed cloud, early beta, $200 Cursor Ultra / $300 SuperGrok Heavy / $120 per-seat Cursor Premium Teams.
- Grok Build: `https://docs.x.ai/build/overview` and `https://github.com/xai-org/grok-build`, Apache-2.0 coding harness.
- OpenClaw: `https://docs.openclaw.ai/start/getting-started`, MIT local/self-hosted personal agent, Node version floors, formal threat model.
- Hermes Agent: official quickstart, provider, security, pricing, cloud pricing, and MIT repository receipts.

- [ ] **Step 5: Add ten Radar entries**

Each Radar entry must omit verdict, hard cost scenarios, and unverified install commands; it must state that Noemium has not reproduced the installation and link the canonical repository as availability evidence.

- [ ] **Step 6: Verify GREEN**

Run: `npm test && npm run validate`

Expected: all schema/content tests pass; validation reports 223 total entries including 14 agents and 0 warnings.

### Task 3: Agent index and field-guide pages

**Files:**
- Create: `src/components/AgentCard.astro`
- Create: `src/lib/agent-display.ts`
- Create: `src/pages/agents/index.astro`
- Create: `src/pages/agents/[slug].astro`
- Create: `tests/agent-pages.test.mjs`

**Interfaces:**
- `formatCostScenario()` returns `$N/mo`, `$N–$M/mo`, or `$N+/mo`.
- `/agents` separates strict guides from Radar and explains evidence tiers.
- `/agents/:slug` renders install, requirements, deployment, providers/channels, cost scenarios, security boundary, limitations, and typed sources when present.

- [ ] **Step 1: Write failing display and built-page tests**

Test literal cost output from `formatCostScenario`. The built-page smoke test reads `dist/agents/index.html`, `dist/agents/grok-bot/index.html`, and `dist/agents/openclaw/index.html`; it asserts the index links both Grok products, Grok Bot displays all three current subscription prices, and OpenClaw displays its install command and security section.

- [ ] **Step 2: Verify RED**

Run the display test directly and then `node --test tests/agent-pages.test.mjs` against the current build.

Expected: FAIL because the helper and `/agents` routes do not exist.

- [ ] **Step 3: Implement the display helper and reusable card**

Keep formatting logic pure. Agent cards show layer, maturity, evidence tier, deployment, starting cost when available, and verdict only for strict entries.

- [ ] **Step 4: Implement `/agents`**

Render a Bold Grid introduction, evidence-tier legend, four strict guide cards, the Radar grid, and a layer taxonomy. The copy must explicitly distinguish coding harnesses, personal agents, and managed work agents.

- [ ] **Step 5: Implement `/agents/[slug]`**

Render only fields admitted by the schema. Radar pages show an explicit “not field-tested / no verdict” notice and never synthesize missing price or install details.

- [ ] **Step 6: Build and verify GREEN**

Run: `npm run build && node --test tests/agent-pages.test.mjs`

Expected: build succeeds and all agent page assertions pass.

### Task 4: Site-wide discovery surfaces

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/search-index.json.ts`
- Modify: `src/islands/CommandPalette.tsx`
- Modify: `src/pages/llms.txt.ts`
- Modify: `src/pages/rss.xml.ts`
- Modify: `src/pages/changelog.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/contribute.astro`
- Modify: `src/pages/og/[...slug].png.ts`
- Modify: `scripts/weekly-diff.mjs`
- Modify: `tests/agent-pages.test.mjs`

**Interfaces:**
- Global nav includes `/agents`.
- Search JSON adds `agents`; command palette emits `kind: 'agent'` rows linking to field guides.
- `llms.txt`, RSS, homepage stats/promo, changelog links, contribution templates, and OG routes recognize the collection.

- [ ] **Step 1: Extend smoke tests and verify RED**

Add assertions that built `search-index.json` contains `grok-bot`, built `llms.txt` links `/agents`, the homepage links the field guide, and `/og/agents/grok-bot.png` exists.

Run: `node --test tests/agent-pages.test.mjs`

Expected: FAIL on the first missing integration.

- [ ] **Step 2: Wire navigation, search, machine surfaces, and RSS**

Add the collection without removing existing tools/stacks/models behavior. Search should include strict and Radar entries but label Radar results.

- [ ] **Step 3: Wire homepage, changelog, contribution, and OG**

The homepage promo should state the exact strict/Radar counts. OG cards use the existing token-derived renderer and display layer plus evidence tier.

- [ ] **Step 4: Verify GREEN**

Run: `npm run build && node --test tests/agent-pages.test.mjs`

Expected: all integration assertions pass.

### Task 5: Correct the research record and verify the release candidate

**Files:**
- Modify: `docs/research/agent-harness-landscape-2026-08-17.md`
- Modify: `docs/audits/2026-08-17-content-freshness-audit.md`
- Modify: `README.md`

**Interfaces:**
- Research distinguishes Grok Bot from Grok Build and cites `https://x.ai/bot` as the primary source.
- README documents `src/content/agents` and the evidence tiers.

- [ ] **Step 1: Correct the Grok section**

Add Grok Bot as a separate managed work-agent launch dated 2026-08-11/12, list its cloud-computer/parallel-bot model and current qualifying plans, then retain Grok Build as its own coding-harness section.

- [ ] **Step 2: Run the full verification gate**

Run: `npm test && npm run price-history && npm run weekly-diff && npm run validate && npm run check && npm run build && node --test tests/agent-pages.test.mjs && git diff --check`

Expected: every command exits 0, validation reports 223 entries and 0 warnings, Astro check reports 0 diagnostics, and build emits the agent routes and OG cards.

- [ ] **Step 3: Visual QA**

Start the Astro development server in background mode, inspect `/agents`, `/agents/grok-bot`, `/agents/openclaw`, and `/agents/hermes-agent` at desktop and mobile widths, verify both themes, follow one card link, and confirm no overflow, clipped pricing, inaccessible headings, or missing source links.

- [ ] **Step 4: Self-review against the approved architecture**

Confirm: separate surface exists; Grok products are distinct; strict guides contain install/requirements/cost/security; Radar has no verdict; all material claims have typed evidence; search/nav/machine surfaces include agents; no existing collection URL changed.
