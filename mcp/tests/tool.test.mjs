import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildIndex } from '../src/data.ts';
import { toolDetail, toolText } from '../src/tools/tool.ts';
import { stackLookup } from '../src/tools/stack.ts';
import { modelLookup } from '../src/tools/model.ts';
import { fixture } from './fixtures.mjs';

const index = buildIndex(fixture);

// `npm run mcp:snapshot` from the mcp/ dir if this file is missing.
const realIndex = buildIndex(
  JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url), 'utf8')),
);

test('a full card carries verdict, limits, receipts and alternatives', () => {
  const detail = toolDetail(index, 'cursor');
  assert.equal(detail.verdict, 'ship');
  assert.ok(detail.skip_when.length > 0, 'skip_when must travel with the praise');
  assert.ok(detail.receipts.length > 0, 'a verdict without receipts is not a Noemium verdict');
  assert.equal(detail.noemium_url, 'https://noemium.com/tools/cursor/');
  assert.ok(detail.alternatives_detail.some((alt) => alt.slug === 'claude-code'));
  assert.ok(detail.alternatives_detail.every((alt) => alt.url.startsWith('https://noemium.com/')));
});

test('an unknown slug errors with suggestions instead of inventing a card', () => {
  const result = toolDetail(index, 'curzor');
  assert.ok(result.error, 'unknown slug must surface an error');
  assert.ok(Array.isArray(result.suggestions));
});

test('a tool that later died carries the death alongside the card', () => {
  const detail = toolDetail(index, 'cursor');
  assert.equal(detail.dead, undefined, 'living tools have no death block');
});

test('toolText names limitations, not just strengths', () => {
  const text = toolText(toolDetail(index, 'cursor'));
  assert.match(text, /Closed source/);
  assert.match(text, /https:\/\/noemium\.com\/tools\/cursor\//);
});

test('a stack by slug returns its tools with verdicts and cost', () => {
  const [stack] = stackLookup(index, { slug: 'solo-coding' });
  assert.equal(stack.monthly_cost_usd, 40);
  assert.ok(stack.tools_detail.every((t) => t.url.startsWith('https://noemium.com/')));
  assert.ok(stack.tools_detail.some((t) => t.verdict === 'ship'));
});

test('a stack search respects the budget ceiling', () => {
  const cheap = stackLookup(index, { task: 'content factory twitter', max_monthly_usd: 20 });
  assert.ok(cheap.every((s) => (s.budget?.monthly_cost_usd ?? s.monthly_cost_usd) <= 20));
});

test('models filter by price and open weights', () => {
  const cheap = modelLookup(index, { max_input_per_mtok: 1 });
  assert.ok(cheap.length >= 1);
  assert.ok(cheap.every((m) => m.price_input_per_mtok <= 1));
  const open = modelLookup(index, { open_weights: true });
  assert.ok(open.every((m) => m.open_weights === true));
  const [one] = modelLookup(index, { slug: 'claude-fable-5' });
  assert.equal(one.provider, 'Anthropic');
});

test('a per-Mtok price filter excludes models priced by a different unit', () => {
  const cheap = modelLookup(realIndex, { max_input_per_mtok: 1 });
  assert.ok(cheap.length >= 1);
  assert.ok(
    cheap.every((m) => m.price_unit === 'mtok'),
    'a model not priced per million tokens must not pass a per-Mtok price filter, ' +
      'even when its price_input_per_mtok sentinel reads as 0',
  );
});

test('the video model the review caught (Veo 3.1) never qualifies as a cheap text model', () => {
  const cheap = modelLookup(realIndex, { max_input_per_mtok: 1 });
  assert.ok(
    cheap.every((m) => m.slug !== 'veo-3-1-generate'),
    'Veo 3.1 is priced per video-second, not per Mtok, and must not appear under a cheap-per-Mtok filter',
  );
});

test('the fix does not over-apply: a real cheap per-Mtok model still passes, and a non-token-priced model still passes filters that are not about token price', () => {
  const cheap = modelLookup(realIndex, { max_input_per_mtok: 1 });
  assert.ok(
    cheap.some((m) => m.slug === 'hunyuan-turbos' && m.price_unit === 'mtok'),
    'a genuinely cheap per-Mtok model must still be returned by max_input_per_mtok filtering',
  );

  const openWeights = modelLookup(realIndex, { open_weights: true });
  assert.ok(
    openWeights.some((m) => m.slug === 'minimax-h3' && m.price_unit !== 'mtok'),
    'a non-token-priced model must still be returned by a query that filters on something other than token price',
  );
});

test('a per-Mtok price filter excludes a mtok-unit card whose zero price is contradicted by price_amount', () => {
  const cheap = modelLookup(realIndex, { max_input_per_mtok: 1 });
  assert.ok(
    cheap.every((m) => !(m.price_input_per_mtok === 0 && m.price_amount)),
    'a model whose price_input_per_mtok is 0 but whose price_amount is non-zero has a placeholder zero, ' +
      'not a real price, and must not pass a per-Mtok price filter',
  );
});

test('seedance-2-5 (price_unit mtok, 0/0 per-Mtok fields, real price of 70 in price_amount) is excluded from the cheap-model filter', () => {
  const cheap = modelLookup(realIndex, { max_input_per_mtok: 1 });
  assert.ok(
    cheap.every((m) => m.slug !== 'seedance-2-5'),
    'seedance-2-5 records its real ~70-per-Mtok price in price_amount, not price_input_per_mtok, ' +
      'so it must not slip through as a nearly-free model',
  );
});

test('the placeholder-zero guard is about price comparability, not about hiding the card', () => {
  const [bySlug] = modelLookup(realIndex, { slug: 'seedance-2-5' });
  assert.equal(bySlug.slug, 'seedance-2-5', 'looking it up directly by slug must still return the card');

  const byOpenWeights = modelLookup(realIndex, { open_weights: false });
  assert.ok(
    byOpenWeights.some((m) => m.slug === 'seedance-2-5'),
    'a query filtering only on open_weights must still include a model the price guard excludes',
  );

  const byProvider = modelLookup(realIndex, { provider: 'ByteDance (Seed / Volcano Engine)' });
  assert.ok(
    byProvider.some((m) => m.slug === 'seedance-2-5'),
    'a query filtering only on provider must still include a model the price guard excludes',
  );
});
