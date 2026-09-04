import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex } from '../src/data.ts';
import { toolDetail, toolText } from '../src/tools/tool.ts';
import { stackLookup } from '../src/tools/stack.ts';
import { modelLookup } from '../src/tools/model.ts';
import { fixture } from './fixtures.mjs';

const index = buildIndex(fixture);

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
