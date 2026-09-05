// Adversarial suite: the whole "weak evidence, strong answer" class, pinned
// against the REAL catalog snapshot rather than a fixture.
//
// Three tools shipped a defect of this class during the branch and had it
// removed; a final review found four more. Every test here is written as a
// PROPERTY over the whole snapshot first — so it still means something when
// the catalog changes — with the specific names the review caught kept
// alongside as named regressions, never instead of the property.
//
// Regenerate the snapshot with `npm run build && npm run mcp:snapshot` from
// the repo root if it is missing; real-snapshot.mjs says so too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { buildIndex, normalizeName, siteUrl } from '../src/data.ts';
import { check } from '../src/tools/check.ts';
import { search } from '../src/search.ts';
import { deadText, modelCardText, toolDetail } from '../src/tools/tool.ts';
import { modelLookup } from '../src/tools/model.ts';
import { stackLookup, stackText } from '../src/tools/stack.ts';
import { formatModelPrice } from '../src/model-format.ts';
import { createHandler } from '../src/server.ts';
import { createWorker } from '../src/worker.ts';
import { loadRealSnapshot } from './real-snapshot.mjs';

const snapshot = await loadRealSnapshot();
const index = buildIndex(snapshot);

/** Statuses that assert a fact about a specific card, as opposed to offering suggestions. */
const CARD_BEARING = new Set(['ship', 'situational', 'skip', 'radar', 'dead', 'model']);

function cardFor(slug, kind) {
  if (kind === 'grave') return index.graveBySlug.get(slug);
  if (kind === 'model') return index.modelBySlug.get(slug);
  return index.toolBySlug.get(slug);
}

function answeredCard(result) {
  return (
    index.toolBySlug.get(result.slug) ??
    index.graveBySlug.get(result.slug) ??
    index.modelBySlug.get(result.slug)
  );
}

/** The H1 rule, restated independently of the implementation that enforces it. */
function namesEachOther(key, card) {
  return [normalizeName(card.name), normalizeName(card.slug)].some(
    (candidate) => candidate !== '' && (key.includes(candidate) || candidate.includes(key)),
  );
}

async function connect(handler) {
  const client = new Client({ name: 'adversarial', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
      fetch: (url, init) => handler.fetch(new Request(url, init)),
    }),
  );
  return client;
}

// ---------------------------------------------------------------------------
// H1 — a match may never state a fact about a differently-named product
// ---------------------------------------------------------------------------

test('property: every card-bearing answer names the thing that was asked about', () => {
  // The universal form of H1. Sweeping every key the index knows (name keys
  // and host keys alike), any answer that asserts a verdict, a death or a
  // model spec must be about a card whose own name or slug and the query
  // contain one another. `langchain` -> LangGraph, `x` -> Grok Imagine and
  // `tailwindcss` -> Tailwind Plus all violate this; `cursor.com` -> cursor
  // and `klingai` -> kling do not.
  let asserted = 0;
  for (const key of index.byNormalizedName.keys()) {
    const [result] = check(index, [key]);
    if (!CARD_BEARING.has(result.status)) continue;
    asserted += 1;
    const card = answeredCard(result);
    assert.ok(card, `${key} answered ${result.status} for slug ${result.slug} with no card behind it`);
    assert.ok(
      namesEachOther(key, card),
      `"${key}" answered ${result.status.toUpperCase()} about "${card.name}" (${result.slug}), ` +
        'a differently-named product — a query may only be answered by a card it names',
    );
  }
  assert.ok(asserted > 200, `expected the sweep to exercise many real answers, got ${asserted}`);
});

test('property: a host-only key that names a different card answers unknown, with that card offered', () => {
  // The same rule from the other side, restricted to the tier that can break
  // it: keys that exist ONLY as a url host. A vendor domain pointing at a
  // differently-named product must degrade to `unknown` plus a candidate,
  // never to that product's verdict.
  let dropped = 0;
  let kept = 0;
  for (const [key, entries] of index.byNormalizedName) {
    if (entries.some((e) => e.via === 'name')) continue;
    if (new Set(entries.map((e) => e.slug)).size !== 1) continue;
    const card = cardFor(entries[0].slug, entries[0].kind);
    const [result] = check(index, [key]);
    if (namesEachOther(key, card)) {
      kept += 1;
      continue;
    }
    dropped += 1;
    assert.equal(
      result.status, 'unknown',
      `host-only key "${key}" points at "${card.name}", which it does not name — must be unknown`,
    );
    assert.equal(result.verdict, undefined);
    assert.equal(result.slug, undefined);
    assert.ok(
      result.candidates?.some((c) => c.slug === entries[0].slug),
      `"${key}" must still offer ${entries[0].slug} as a candidate`,
    );
  }
  assert.ok(dropped > 0 && kept > 0, `expected both outcomes to occur, got kept=${kept} dropped=${dropped}`);
});

test('named regressions: the host-only matches the review caught are no longer verdicts', () => {
  const cases = [
    ['langchain', 'langgraph'],
    ['tailwindcss', 'tailwind-ui'],
    ['jetbrains', 'junie'],
    ['x', 'grok-imagine'],
    ['z', 'glm-coding-plan'],
    ['platform.claude.com', 'anthropic-api'],
  ];
  for (const [query, expectedCandidate] of cases) {
    const [result] = check(index, [query]);
    assert.equal(result.status, 'unknown', `${query} must not answer with a verdict`);
    assert.equal(result.verdict, undefined);
    assert.equal(result.verdict_text, undefined, `${query} must not leak an endorsement`);
    assert.ok(
      result.candidates?.some((c) => c.slug === expectedCandidate),
      `${query} should still suggest ${expectedCandidate}`,
    );
  }
});

test('counter-cases: a host that does name its own card still answers', () => {
  // The rule is about evidence, not about muting host lookups. These three
  // are the same product under its own domain and must keep answering.
  for (const query of ['cursor.com', 'klingai', 'aider.chat']) {
    const [result] = check(index, [query]);
    assert.ok(CARD_BEARING.has(result.status), `${query} must still resolve, got ${result.status}`);
    assert.ok(result.slug, `${query} must name a card`);
    assert.ok(result.url?.startsWith('https://noemium.com/'));
  }
});

// ---------------------------------------------------------------------------
// Very short queries
// ---------------------------------------------------------------------------

test('property: one- and two-character queries never answer with a card that is not exactly named that', () => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
  const queries = [...alphabet];
  for (const a of alphabet) for (const b of alphabet) queries.push(a + b);

  let resolved = 0;
  for (const query of queries) {
    const [result] = check(index, [query]);
    if (result.status !== 'unknown') resolved += 1;
    if (!CARD_BEARING.has(result.status)) continue;
    const card = answeredCard(result);
    assert.ok(card, `"${query}" answered ${result.status} with no card behind it`);
    assert.ok(
      normalizeName(card.name) === query || normalizeName(card.slug) === query,
      `a ${query.length}-character query answered ${result.status.toUpperCase()} about "${card.name}", ` +
        'which is not what it spells',
    );
  }
  // Not a vacuous sweep: the catalog really does hold short names, and they
  // must keep resolving. Today that is the "Pi" tool (answered) and the
  // "v0"/"v0-dev" collision (ambiguous, listing both) — the rule is about
  // evidence, not about muting every short query.
  assert.ok(resolved > 0, 'expected at least one short query to resolve to something real');
});

test('named regressions: "x" and "z" are unknown, not somebody else\'s verdict', () => {
  for (const query of ['x', 'z']) {
    const [result] = check(index, [query]);
    assert.equal(result.status, 'unknown');
    assert.equal(result.verdict, undefined);
    assert.equal(result.verdict_text, undefined);
  }
});

// ---------------------------------------------------------------------------
// H3 — a model name through `check`
// ---------------------------------------------------------------------------

test('property: no model in the catalog is unknown to check, and none borrows a verdict', () => {
  const modelsUrl = siteUrl('model', 'any');
  let answered = 0;
  for (const model of snapshot.models) {
    for (const query of [model.name, model.slug]) {
      const [result] = check(index, [query]);
      assert.notEqual(
        result.status, 'unknown',
        `"${query}" is a model card in the catalog; check must not say it has no card`,
      );
      if (result.status !== 'model') {
        // The only other honest outcome is a genuine name collision with
        // another card (the catalog has one: the "Veo 3.1" tool and the
        // "Veo 3.1" model), which must surface as ambiguous, not a pick.
        assert.equal(result.status, 'ambiguous', `"${query}" resolved as ${result.status}`);
        assert.ok(result.candidates?.some((c) => c.slug === model.slug));
        continue;
      }
      answered += 1;
      assert.equal(result.slug, model.slug);
      assert.equal(result.verdict, undefined, 'a model card carries no verdict');
      assert.equal(result.verdict_text, undefined);
      assert.equal(result.price_note, formatModelPrice(model), 'price comes from the one shared renderer');
      assert.equal(result.last_verified, model.last_verified);
      assert.equal(result.open_weights, model.open_weights);
      assert.equal(result.url, modelsUrl);
    }
  }
  assert.ok(answered > 40, `expected most model lookups to answer, got ${answered}`);
});

test('named regressions: the three model names the review checked all answer', async () => {
  const client = await connect(createHandler(snapshot));
  const names = ['Claude Opus 5', 'Claude Sonnet 5', 'DeepSeek V4 Flash'];
  const res = await client.callTool({ name: 'check', arguments: { names } });
  for (const [i, name] of names.entries()) {
    const result = res.structuredContent.results[i];
    assert.equal(result.status, 'model', `${name} must resolve to its model card`);
    assert.ok(result.price_note, `${name} must carry a price`);
    assert.ok(result.last_verified, `${name} must carry a verification date`);
    assert.equal(result.url, 'https://noemium.com/models/');
  }
  assert.match(res.content[0].text, /Claude Opus 5 — MODEL card/);
  assert.doesNotMatch(res.content[0].text, /No Noemium card/);
  await client.close();
});

// ---------------------------------------------------------------------------
// H4 — every graveyard slug through `tool`
// ---------------------------------------------------------------------------

test('property: every graveyard slug is a real answer for `tool`, never an unknown-slug error', async () => {
  const client = await connect(createHandler(snapshot));
  assert.ok(snapshot.graveyard.length > 0, 'the graveyard must not be empty for this to mean anything');

  for (const grave of snapshot.graveyard) {
    const detail = toolDetail(index, grave.slug);
    assert.ok(!('error' in detail), `${grave.slug} must not be an unknown slug`);

    // A slug that is both a live tool card and a grave keeps the composed
    // tool-card answer (with its `dead` block); a grave-only slug returns the
    // death as a first-class card.
    if ('died' in detail) {
      assert.equal(detail.died, grave.died);
      assert.equal(detail.receipt, grave.receipt);
      assert.equal(detail.noemium_url, 'https://noemium.com/graveyard/');
      const hasSuccessor = !('none' in grave.succeeded_by);
      assert.equal(Boolean(detail.successor), hasSuccessor, `${grave.slug} successor narrowing`);
      if (hasSuccessor) assert.equal(detail.successor.name, grave.succeeded_by.name);
      const text = deadText(detail);
      assert.match(text, /DEAD since \d{4}-\d{2}-\d{2}/, `${grave.slug} must read as dead`);
      assert.match(text, /Do not recommend or install it/);
      assert.doesNotMatch(text, /\bSHIP\b/, `${grave.slug} must not read like a recommendation`);
    } else {
      assert.ok(detail.dead, `${grave.slug} has both cards, so the tool answer must carry the death`);
    }

    const res = await client.callTool({ name: 'tool', arguments: { slug: grave.slug } });
    assert.notEqual(res.isError, true, `tool({slug:"${grave.slug}"}) must not be an error`);
    assert.match(res.content[0].text, /DEAD|died/i, `${grave.slug} must be reported as dead`);
  }
  await client.close();
});

test('named regression: check hands over "flowise" and tool answers with the death', async () => {
  const client = await connect(createHandler(snapshot));
  const checked = await client.callTool({ name: 'check', arguments: { names: ['flowise'] } });
  const slug = checked.structuredContent.results[0].slug;
  assert.equal(slug, 'flowise');

  const res = await client.callTool({ name: 'tool', arguments: { slug } });
  assert.notEqual(res.isError, true);
  assert.match(res.content[0].text, /Flowise — DEAD since 2026-08-31/);
  assert.match(res.content[0].text, /Receipt: https:\/\//);
  assert.equal(res.structuredContent.noemium_url, 'https://noemium.com/graveyard/');
  await client.close();
});

test('a genuinely unknown slug is still an error, and a one-character slug suggests nothing', async () => {
  const client = await connect(createHandler(snapshot));

  const unknown = await client.callTool({ name: 'tool', arguments: { slug: 'not-a-real-tool-at-all' } });
  assert.equal(unknown.isError, true);
  assert.match(unknown.content[0].text, /unknown slug/i);

  const noisy = toolDetail(index, '-');
  assert.deepEqual(noisy.suggestions, [], 'a one-character slug must not suggest the alphabet');
  const res = await client.callTool({ name: 'tool', arguments: { slug: '-' } });
  assert.equal(res.isError, true);
  assert.doesNotMatch(res.content[0].text, /Did you mean/);
  await client.close();
});

// ---------------------------------------------------------------------------
// H2 — exactly one place renders a model price
// ---------------------------------------------------------------------------

test('property: every model hit in `search` renders the same price string as the shared formatter', () => {
  let checked = 0;
  let nonTokenPriced = 0;
  for (const model of snapshot.models) {
    const hit = search(index, model.name, { limit: 20 }).find(
      (h) => h.kind === 'model' && h.slug === model.slug,
    );
    if (!hit) continue;
    checked += 1;
    assert.equal(
      hit.price_note, formatModelPrice(model),
      `${model.slug} renders a price search built itself instead of the shared formatter`,
    );
    if (model.price_unit !== 'mtok') {
      nonTokenPriced += 1;
      assert.doesNotMatch(
        hit.price_note, /per Mtok/,
        `${model.slug} is priced per ${model.price_unit}, so it must not render a per-Mtok price`,
      );
      assert.doesNotMatch(
        hit.price_note, /^\$0\/\$0/,
        `${model.slug} must not render its per-Mtok sentinel zeros as a price`,
      );
    }
    assert.doesNotMatch(hit.tagline, /\?\s*ctx/, `${model.slug} must not render "? ctx"`);
  }
  assert.ok(checked > 20, `expected the sweep to reach many models, got ${checked}`);
  assert.ok(nonTokenPriced > 0, 'the sweep must include at least one non-token-priced model');
});

test('named regression: whisper transcription no longer prices Whisper Large v3 as free', async () => {
  const client = await connect(createHandler(snapshot));
  const res = await client.callTool({ name: 'search', arguments: { query: 'whisper transcription' } });
  const hit = res.structuredContent.results.find((h) => h.slug === 'whisper-v3');
  assert.ok(hit, 'Whisper Large v3 must surface for this query');
  assert.doesNotMatch(hit.price_note, /\$0\/\$0 per Mtok/, 'a per-audio-second model is not free per token');
  assert.match(hit.price_note, /per audio-second/);
  assert.doesNotMatch(res.content[0].text, /\$0\/\$0 per Mtok/, 'the rendered text must not say it either');
  assert.doesNotMatch(res.content[0].text, /\?\s*ctx/);
  await client.close();
});

// ---------------------------------------------------------------------------
// H5 — an out-of-range filter value is a validation error, not a confident zero
// ---------------------------------------------------------------------------

test('property: every pricing and category value in the catalog is accepted, and nothing else is', async () => {
  const client = await connect(createHandler(snapshot));
  const pricingValues = [...new Set(snapshot.tools.map((t) => t.pricing))];
  const categoryValues = [
    ...new Set([...snapshot.tools.map((t) => t.category), ...snapshot.graveyard.map((g) => g.category)]),
  ];
  assert.ok(pricingValues.length > 1 && categoryValues.length > 1, 'the catalog must have values to enumerate');

  for (const pricing of pricingValues) {
    const res = await client.callTool({ name: 'search', arguments: { query: 'video generation', pricing } });
    assert.notEqual(res.isError, true, `pricing "${pricing}" is real data and must be accepted`);
  }
  for (const category of categoryValues) {
    const res = await client.callTool({ name: 'search', arguments: { query: 'video generation', category } });
    assert.notEqual(res.isError, true, `category "${category}" is real data and must be accepted`);
  }

  // Out of range: wrong case, the design spec's own phantom `open-source`
  // pricing tier (open-source is a tool attribute, not a price), and a
  // category nobody uses. Each used to return "No card for this. Noemium does
  // not guess." — a false claim that the catalog has nothing.
  for (const [field, value] of [
    ['pricing', 'Free'],
    ['pricing', 'open-source'],
    ['pricing', 'enterprise'],
    ['category', 'Coding'],
    ['category', 'llm'],
  ]) {
    const res = await client.callTool({
      name: 'search',
      arguments: { query: 'video generation', [field]: value },
    });
    assert.equal(res.isError, true, `${field}: "${value}" is not in the catalog and must be refused`);
    assert.doesNotMatch(
      res.content[0].text, /does not guess/,
      `${field}: "${value}" must not be answered with an honest-looking zero`,
    );
  }
  await client.close();
});

// ---------------------------------------------------------------------------
// H6 — model ordering and unknown model slugs
// ---------------------------------------------------------------------------

test('property: with no token-price filter, models are not ordered by a field full of sentinels', () => {
  const results = modelLookup(index, { limit: snapshot.models.length });
  assert.ok(Array.isArray(results) && results.length > 10);
  for (let i = 1; i < results.length; i += 1) {
    assert.ok(
      results[i - 1].popularity >= results[i].popularity,
      `unfiltered model order must be non-increasing in popularity, broke at ${results[i].slug}`,
    );
  }
  // The specific dishonesty: the head of an unfiltered list used to be the ten
  // media models whose per-Mtok price is a `0` placeholder.
  const head = results.slice(0, 10);
  assert.ok(
    head.some((m) => m.price_unit === 'mtok'),
    'an unfiltered model list must not be led entirely by non-token-priced cards',
  );
});

test('an unknown model slug is an explicit error with suggestions, not "no match"', async () => {
  // A model slug the catalog does not have must never be answered with "No
  // model matches those filters" — the call carried no filters, so that
  // sentence claims the catalog has nothing like it, which is a different and
  // false statement. Suggestions follow the same substring rule as `tool`:
  // they appear when there is a near slug ('veo-3-1' is a prefix of the real
  // 'veo-3-1-generate') and stay honestly empty when there is not.
  const noNearMatch = modelLookup(index, { slug: 'veo-3-1-typo' });
  assert.ok('error' in noNearMatch, 'an unknown model slug must be an error, not an empty result');
  assert.deepEqual(noNearMatch.suggestions, []);

  const nearMatch = modelLookup(index, { slug: 'veo-3-1' });
  assert.ok('error' in nearMatch);
  assert.ok(nearMatch.suggestions.includes('veo-3-1-generate'), 'a near slug should be suggested');

  const client = await connect(createHandler(snapshot));
  const res = await client.callTool({ name: 'model', arguments: { slug: 'veo-3-1-typo' } });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /unknown model slug/i);
  assert.doesNotMatch(res.content[0].text, /No model matches those filters/);

  const suggested = await client.callTool({ name: 'model', arguments: { slug: 'veo-3-1' } });
  assert.equal(suggested.isError, true);
  assert.match(suggested.content[0].text, /Did you mean: .*veo-3-1-generate/);
  await client.close();
});

// ---------------------------------------------------------------------------
// Residual fix 1 — `tool` denying every model slug, right after `check`
// learned to hand them out
// ---------------------------------------------------------------------------

test('property: every slug `check` resolves as a model answers through `tool` too, identified as a model', () => {
  // The exact H3/H4 handoff shape: `check` now returns `slug: "claude-opus-5"`
  // for a model name, and the natural next call is `tool({slug})`. Sweeps
  // every real model by both name and slug (skipping the rare name collision
  // that `check` itself reports as `ambiguous`, e.g. "Veo 3.1") and asserts
  // `tool` never denies what `check` just handed out.
  let answered = 0;
  for (const model of snapshot.models) {
    for (const query of [model.name, model.slug]) {
      const [result] = check(index, [query]);
      if (result.status !== 'model') continue;
      answered += 1;
      const detail = toolDetail(index, result.slug);
      assert.ok(!('error' in detail), `tool({slug:"${result.slug}"}) denied a model card check just handed out`);
      assert.ok('provider' in detail, `tool({slug:"${result.slug}"}) did not identify the model card`);
      assert.equal(detail.slug, model.slug);
      assert.equal(
        formatModelPrice(detail), formatModelPrice(model),
        `tool({slug:"${result.slug}"}) must price the model with the one shared formatter`,
      );
      const text = modelCardText(detail);
      assert.match(text, /is a MODEL card, not a tool/, `${result.slug} must read plainly as a model card`);
      assert.doesNotMatch(
        text, /\bSHIP\b|\bSITUATIONAL\b|\bSKIP\b|\bRADAR\b/,
        `${result.slug} must not read like a tool verdict`,
      );
    }
  }
  assert.ok(answered > 40, `expected the sweep to reach most models, got ${answered}`);
});

test('named regression: tool({slug:"claude-opus-5"}) answers as a model, not an unknown-slug error', async () => {
  const client = await connect(createHandler(snapshot));
  const res = await client.callTool({ name: 'tool', arguments: { slug: 'claude-opus-5' } });
  assert.notEqual(res.isError, true);
  assert.equal(res.structuredContent.provider, 'Anthropic');
  assert.match(res.content[0].text, /is a MODEL card, not a tool/);
  assert.doesNotMatch(res.content[0].text, /Unknown slug/i);
  await client.close();
});

test('the model handoff does not regress the graveyard one: every graveyard slug still answers dead through `tool`', () => {
  for (const grave of snapshot.graveyard) {
    const detail = toolDetail(index, grave.slug);
    assert.ok(!('error' in detail), `${grave.slug} must not be an unknown-slug error`);
    if ('died' in detail) {
      assert.equal(detail.died, grave.died);
      assert.ok(!('provider' in detail), `${grave.slug} must not be mistaken for a model card`);
    } else {
      // A slug that is both a live tool card and a grave keeps the composed
      // tool-card answer, with the death carried in its `dead` block.
      assert.ok(detail.dead, `${grave.slug} has both cards, so the tool answer must still carry the death`);
    }
  }
});

test('property: every tool slug still answers as a tool card, never mistaken for a model or a death it does not have', () => {
  let checked = 0;
  for (const tool of snapshot.tools) {
    const detail = toolDetail(index, tool.slug);
    assert.ok(!('error' in detail), `${tool.slug} must not be an unknown-slug error`);
    assert.ok(!('provider' in detail), `${tool.slug} must not be rendered as a model card`);
    assert.ok(!('died' in detail), `${tool.slug} has its own card and must not read as a graveyard-only entry`);
    checked += 1;
  }
  assert.ok(checked > 200, `expected the sweep to reach most tools, got ${checked}`);
});

// ---------------------------------------------------------------------------
// Residual fix 2 — an unknown `stack` slug is an explicit error, not the
// confident-sounding "does not guess" honest zero
// ---------------------------------------------------------------------------

test('an unknown stack slug is an explicit error with suggestions, never the "does not guess" line', () => {
  const result = stackLookup(index, { slug: 'not-a-real-stack' });
  assert.ok('error' in result, 'an unknown stack slug must be an error, not an empty result');
  assert.match(result.error, /Unknown stack slug/i);
  assert.ok(Array.isArray(result.suggestions));
});

test('a task query matching nothing in the stack catalog still returns the honest-zero line, not an error', () => {
  // The residual's own distinction: a real question that genuinely matches
  // nothing is a real answer, and must stay `stackText`'s honest zero rather
  // than being folded into the new unknown-slug error path.
  const result = stackLookup(index, { task: 'zzzz qqqq wubalubadubdub, a task nobody in this catalog does' });
  assert.ok(Array.isArray(result), 'a genuinely unmatched task query must be a real empty answer, not an error');
  assert.equal(result.length, 0);
  assert.equal(stackText(result), 'No stack for this. Noemium does not guess.');
});

test('a one-character stack slug suggests nothing', () => {
  const result = stackLookup(index, { slug: '-' });
  assert.ok('error' in result);
  assert.deepEqual(result.suggestions, [], 'a one-character slug must not suggest the alphabet');
});

test('named regression over MCP: stack({slug:"nope"}) is an explicit error, and a real slug still answers', async () => {
  const client = await connect(createHandler(snapshot));

  const unknown = await client.callTool({ name: 'stack', arguments: { slug: 'nope' } });
  assert.equal(unknown.isError, true);
  assert.match(unknown.content[0].text, /Unknown stack slug/i);
  assert.doesNotMatch(unknown.content[0].text, /does not guess/);

  const [{ slug: realSlug }] = snapshot.stacks;
  const known = await client.callTool({ name: 'stack', arguments: { slug: realSlug } });
  assert.notEqual(known.isError, true);
  assert.ok(known.structuredContent.results.length > 0);

  const nothingMatches = await client.callTool({
    name: 'stack',
    arguments: { task: 'zzzz qqqq wubalubadubdub, a task nobody in this catalog does' },
  });
  assert.notEqual(nothingMatches.isError, true, 'a genuinely unmatched task query must not become an error');
  assert.equal(nothingMatches.structuredContent.results.length, 0);
  assert.match(nothingMatches.content[0].text, /does not guess/);

  await client.close();
});

// ---------------------------------------------------------------------------
// Spec §6 — per-tool telemetry, and its kill switch
// ---------------------------------------------------------------------------

function telemetryEnv(overrides = {}) {
  const points = [];
  return {
    points,
    env: { ANALYTICS: { writeDataPoint: (p) => points.push(p) }, ...overrides },
  };
}

async function callThroughWorker(env, toolCall) {
  const worker = createWorker(snapshot);
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };
  const client = new Client({ name: 'telemetry', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
      fetch: (url, init) => worker.fetch(new Request(url, init), env, ctx),
    }),
  );
  const res = await client.callTool(toolCall);
  await client.close();
  await Promise.all(waits);
  return res;
}

test('one telemetry data point per tool call, with the fields spec §6 names and nothing else', async () => {
  const { points, env } = telemetryEnv();
  await callThroughWorker(env, { name: 'check', arguments: { names: ['flowise', 'cursor'] } });

  const toolPoints = points.filter((p) => p.blobs?.[0] === 'check');
  assert.equal(toolPoints.length, 1, 'exactly one data point for one tool call');
  const [point] = toolPoints;
  assert.deepEqual(point.indexes, ['check']);
  assert.equal(point.blobs.length, 3, 'blobs = [tool_name, normalized_query_or_slug, result_status]');
  assert.equal(point.blobs[1], 'flowise,cursor', 'the normalized names, and nothing about the caller');
  assert.equal(point.blobs[2], 'dead+ship');
  assert.equal(point.doubles.length, 2, 'doubles = [result_count, ms]');
  assert.equal(point.doubles[0], 2);
  assert.ok(Number.isFinite(point.doubles[1]) && point.doubles[1] >= 0);
});

test('TELEMETRY=off records nothing, and a broken analytics binding cannot break an answer', async () => {
  const off = telemetryEnv({ TELEMETRY: 'off' });
  const res = await callThroughWorker(off.env, { name: 'check', arguments: { names: ['flowise'] } });
  assert.equal(off.points.length, 0, 'the kill switch must stop all recording');
  assert.match(res.content[0].text, /DEAD/, 'and must not affect the answer');

  const broken = {
    ANALYTICS: {
      writeDataPoint: () => {
        throw new Error('analytics engine is down');
      },
    },
  };
  const stillFine = await callThroughWorker(broken, { name: 'check', arguments: { names: ['flowise'] } });
  assert.notEqual(stillFine.isError, true);
  assert.match(stillFine.content[0].text, /DEAD/);
});

test('telemetry records the status of an answer, including the unknown ones the catalog wants to see', async () => {
  const { points, env } = telemetryEnv();
  await callThroughWorker(env, { name: 'search', arguments: { query: 'zzzz qqqq wubalubadubdub' } });
  const [point] = points.filter((p) => p.blobs?.[0] === 'search');
  assert.equal(point.blobs[1], 'zzzz qqqq wubalubadubdub');
  assert.equal(point.blobs[2], 'empty');
  assert.equal(point.doubles[0], 0);
});
