import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex } from '../src/data.ts';
import { search, searchText, NO_RESULTS_NOTE } from '../src/search.ts';
import { fixture } from './fixtures.mjs';

const index = buildIndex(fixture);

test('a task query finds the matching tool with reasons', () => {
  const hits = search(index, 'video generation');
  assert.ok(hits.length >= 1, 'expected at least one hit');
  assert.equal(hits[0].slug, 'kling');
  assert.ok(hits[0].why.length > 0 && hits[0].why.length <= 3, 'why lists up to three tokens');
  assert.equal(hits[0].url, 'https://noemium.com/tools/kling/');
  assert.ok(hits[0].last_verified, 'every hit carries last_verified');
});

test('nonsense returns nothing rather than a guess', () => {
  assert.deepEqual(search(index, 'zzzz qqqq wubalubadubdub'), []);
});

test('the verdict filter never returns another tier', () => {
  const hits = search(index, 'coding editor agent', { verdict: 'ship' });
  assert.ok(hits.length >= 1);
  assert.ok(hits.every((hit) => hit.verdict === 'ship'), 'ship filter leaks other verdicts');
});

test('dead products are labelled dead so agents cannot recommend them', () => {
  const hits = search(index, 'flowise low-code automation');
  const dead = hits.find((hit) => hit.slug === 'flowise');
  assert.ok(dead, 'flowise should surface');
  assert.equal(dead.kind, 'dead');
  assert.equal(dead.url, 'https://noemium.com/graveyard/');
});

test('stacks and models are searchable alongside tools', () => {
  assert.ok(search(index, 'content factory twitter').some((hit) => hit.kind === 'stack'));
  assert.ok(search(index, 'cheap bulk classification open weights').some((hit) => hit.kind === 'model'));
});

test('limit caps the result count', () => {
  assert.ok(search(index, 'coding agent editor', { limit: 1 }).length === 1);
});

test('searchText states the honest zero', () => {
  assert.match(searchText([]), new RegExp(NO_RESULTS_NOTE));
});

// --- Filters that should exclude verdict-less kinds entirely ---

test('a verdict or pricing filter drops stacks, models and graves rather than ignoring the filter', () => {
  // None of these kinds carry a `verdict` or `pricing` field, so a filter on
  // either must mean "no match", never "field absent, so let it through." The
  // query mixes terms that hit the flowise grave, the twitter stack and the
  // classification model with "video generation" (which also hits kling, a
  // ship/freemium tool) so the assertion isn't vacuously true over an empty
  // result set — kling must survive while the other three kinds vanish.
  const query = 'flowise content twitter classification video generation';

  const byVerdict = search(index, query, { verdict: 'ship' });
  assert.ok(byVerdict.some((hit) => hit.slug === 'kling'), 'kling should still surface under the ship filter');
  assert.ok(byVerdict.every((hit) => hit.kind === 'tool'), 'verdict filter must drop non-tool kinds');

  const byPricing = search(index, query, { pricing: 'freemium' });
  assert.ok(byPricing.some((hit) => hit.slug === 'kling'), 'kling should still surface under the pricing filter');
  assert.ok(byPricing.every((hit) => hit.kind === 'tool'), 'pricing filter must drop non-tool kinds');
});

test('the radar filter means "no verdict yet", not the literal string radar', () => {
  // No fixture tool's verdict field is ever the string 'radar' — it means
  // verdict === undefined. A naive `tool.verdict === filters.verdict` check
  // would also happen to return nothing against fixtures.mjs (every fixture
  // tool already carries a real verdict), which would make an exclusion-only
  // test pass for the wrong reason. So this builds one radar tool (verdict
  // omitted) alongside one shipping tool, both matching the same query text,
  // and checks the radar filter finds exactly the radar one.
  const radarSnapshot = {
    built: '2026-09-05', counts: { tools: 2, models: 0, stacks: 0, graveyard: 0 },
    tools: [
      { slug: 'gizmo-shipped', name: 'Gizmo Analyzer', tagline: 'Analyzes gizmos.', category: 'gizmos',
        pricing: 'free', verdict: 'ship', last_verified: '2026-09-01' },
      { slug: 'gizmo-radar', name: 'Gizmo Scanner', tagline: 'Analyzes gizmos, unverified.',
        category: 'gizmos', pricing: 'free', last_verified: '2026-09-01' },
    ],
    models: [], stacks: [], graveyard: [],
  };
  const radarIndex = buildIndex(radarSnapshot);
  const hits = search(radarIndex, 'gizmo analyzer', { verdict: 'radar' });
  assert.deepEqual(hits.map((h) => h.slug), ['gizmo-radar'], 'radar filter finds the verdict-less card only');
});

// --- Freshness bonus, made robust to the passage of time ---
//
// Rather than pinning an absolute date (which would rot once "today" drifts
// far enough from the fixture dates), this builds a pair of cards that are
// textually identical except for last_verified: one dated "today" (always
// inside the 60-day window, whenever the suite runs) and one dated in 2000
// (always outside it). The freshness bonus is exercised as a genuine score
// delta, not merely as the secondary last_verified sort key, by asserting
// hits[0].score is strictly greater than hits[1].score.

test('a freshly verified card outscores an identical stale one, regardless of today\'s date', () => {
  const today = new Date().toISOString().slice(0, 10);
  const freshnessSnapshot = {
    built: today,
    counts: { tools: 2, models: 0, stacks: 0, graveyard: 0 },
    tools: [
      {
        slug: 'widget-fresh', name: 'Widget Grinder', tagline: 'Grinds widgets fast.',
        category: 'widgets', pricing: 'free', last_verified: today,
      },
      {
        slug: 'widget-stale', name: 'Widget Grinder', tagline: 'Grinds widgets fast.',
        category: 'widgets', pricing: 'free', last_verified: '2000-01-01',
      },
    ],
    models: [],
    stacks: [],
    graveyard: [],
  };
  const freshnessIndex = buildIndex(freshnessSnapshot);
  const hits = search(freshnessIndex, 'widget grinder');
  assert.equal(hits.length, 2, 'both identically-worded cards should match');
  assert.equal(hits[0].slug, 'widget-fresh', 'the freshly verified card ranks first');
  assert.equal(hits[1].slug, 'widget-stale');
  assert.ok(hits[0].score > hits[1].score, 'freshness must move the score, not only the tiebreak');
});
