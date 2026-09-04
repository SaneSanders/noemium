import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildIndex } from '../src/data.ts';
import { search, searchText, NO_RESULTS_NOTE } from '../src/search.ts';
import { fixture } from './fixtures.mjs';

const index = buildIndex(fixture);

// Same real-catalog loading pattern as tests/check.test.mjs — regenerate with
// `npm run mcp:snapshot` from the mcp/ dir if this file is missing.
const realSnapshot = JSON.parse(
  await readFile(new URL('../data/snapshot.json', import.meta.url), 'utf8'),
);
const realIndex = buildIndex(realSnapshot);

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

// --- Fix round 1: category filter must scope every kind, not just tools ---

test('a category filter scopes tools and graves by their own category and drops models/stacks entirely (real snapshot)', () => {
  // Regression for the review finding: 'category' used to be checked only in
  // the tools loop, so a category-filtered search still let stacks, models
  // and every graveyard entry (none scoped to the requested category) leak
  // through. Reproduced against the real catalog: this exact query used to
  // return the dead "Void" and "Roo Code" (both category 'coding') plus
  // models/stacks under a category: 'design' filter.
  const hits = search(realIndex, 'editor void code', { category: 'design' });
  assert.ok(hits.length >= 1, 'expected at least one design-category hit to exercise the assertion');

  // Graves carry their own `category` field (see src/content-schemas.ts
  // graveyardSchema) so they are filtered by it, same as tools. Models and
  // stacks have no category concept at all, so they must be excluded outright
  // rather than let a category filter silently pass them through.
  const categoryOf = new Map([
    ...realSnapshot.tools.map((t) => [t.slug, t.category]),
    ...realSnapshot.graveyard.map((g) => [g.slug, g.category]),
  ]);

  for (const hit of hits) {
    assert.ok(
      hit.kind === 'tool' || hit.kind === 'dead',
      `${hit.kind}:${hit.slug} has no category concept and must not appear under a category filter`,
    );
    assert.equal(
      categoryOf.get(hit.slug), 'design',
      `${hit.kind}:${hit.slug} is category '${categoryOf.get(hit.slug)}', not the requested 'design'`,
    );
  }
});

// --- Fix round 1: the quality floor applies to raw relevance, not the ---
// --- bonus-adjusted total ---

// MIN_SCORE and FRESH_DAYS are not exported from src/search.ts (they are
// internal constants the controller ruling says must not change), so this
// reconstructs the same bonus math search.ts applies in `buildHit` purely
// from what a SearchHit already exposes (`verdict`, `last_verified`) to
// recover each hit's pre-bonus raw score and check it against the floor.
const MIN_SCORE = 3;
const FRESH_DAYS = 60;
function bonusFor(hit, now) {
  let bonus = 0;
  if (hit.verdict === 'ship') bonus += 1;
  if (hit.verdict === 'skip') bonus -= 2;
  const verified = Date.parse(`${hit.last_verified}T00:00:00Z`);
  if (Number.isFinite(verified) && (now - verified) / 86_400_000 <= FRESH_DAYS) bonus += 1;
  return bonus;
}

test('a "legal" search never surfaces a hit whose raw relevance is below the quality floor (real snapshot)', () => {
  // Regression for the review finding: Suno (a song-generation tool) used to
  // score 3 and render as a confident [SHIP] hit for a "legal" query purely
  // because its verdict_text has one coincidental mention of "the legal
  // situation around training data" — raw relevance 1, lifted over MIN_SCORE
  // (3) only by the +1 ship bonus and +1 freshness bonus stacking on top.
  // That is exactly the "weak evidence, strong answer" failure the `check`
  // tool already had removed once.
  const now = Date.now();
  const hits = search(realIndex, 'legal');

  assert.ok(
    !hits.some((hit) => hit.slug === 'suno'),
    'Suno must not be recommended for a legal query on a single coincidental word',
  );

  // The general, catalog-agnostic pin: whatever the catalog looks like on any
  // given day, no returned hit's score, once the ship/skip/freshness bonuses
  // are subtracted back out, may fall below MIN_SCORE. If it does, a bonus
  // rather than genuine text relevance is what earned the hit its place.
  for (const hit of hits) {
    const rawScore = hit.score - bonusFor(hit, now);
    assert.ok(
      rawScore >= MIN_SCORE,
      `${hit.slug} has raw relevance ${rawScore} (total ${hit.score}) — below MIN_SCORE=${MIN_SCORE}, so a bonus alone must have qualified it`,
    );
  }
});

// --- Fix round 1: bonuses still order results among cards that already ---
// --- clear the floor on their own ---

test('the ship bonus still breaks a tie in ranking between two cards with identical raw relevance', () => {
  // Two cards, textually identical (so their raw field-weight score is the
  // same and both clear MIN_SCORE comfortably on text relevance alone) and
  // verified on the same day (so the freshness bonus applies equally to
  // both and cannot be what separates them). Only the verdict differs, so if
  // the ship bonus still nudges ranking as the controller ruling requires
  // ("bonuses adjust the score for ORDERING"), the shipping card must score
  // exactly one point higher and rank first.
  const today = new Date().toISOString().slice(0, 10);
  const tieSnapshot = {
    built: today,
    counts: { tools: 2, models: 0, stacks: 0, graveyard: 0 },
    tools: [
      {
        slug: 'gadget-fixer-ship', name: 'Gadget Fixer', tagline: 'Fixes gadgets quickly.',
        category: 'gadgets', pricing: 'free', verdict: 'ship', last_verified: today,
      },
      {
        slug: 'gadget-fixer-plain', name: 'Gadget Fixer', tagline: 'Fixes gadgets quickly.',
        category: 'gadgets', pricing: 'free', last_verified: today,
      },
    ],
    models: [],
    stacks: [],
    graveyard: [],
  };
  const tieIndex = buildIndex(tieSnapshot);
  const hits = search(tieIndex, 'gadget fixer');
  assert.equal(hits.length, 2, 'both identically-worded cards should match');
  assert.equal(hits[0].slug, 'gadget-fixer-ship', 'the shipping card ranks first on an otherwise-tied score');
  assert.equal(hits[1].slug, 'gadget-fixer-plain');
  assert.equal(hits[0].score, hits[1].score + 1, 'the ship bonus is exactly +1, applied on top of an identical raw score');
});
