import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAutoPairs } from '../src/lib/compare-auto.ts';

function makeTool(id, opts = {}) {
  return {
    id,
    name: id,
    category: opts.category ?? 'coding',
    verdict: 'verdict' in opts ? opts.verdict : 'ship',
    featured: opts.featured ?? false,
    last_verified: opts.last_verified ?? '2026-09-01',
  };
}

test('auto pairs enforce same category', () => {
  const pairs = buildAutoPairs(
    [
      makeTool('a', { category: 'coding', verdict: 'ship' }),
      makeTool('b', { category: 'audio', verdict: 'ship' }),
    ],
    [],
  );
  assert.equal(pairs.length, 0);
});

test('auto pairs dedupe against curated pairs in either order', () => {
  const pairs = buildAutoPairs(
    [
      makeTool('anchor', { verdict: 'ship', featured: true }),
      makeTool('rival', { verdict: 'ship' }),
    ],
    [{ a: 'rival', b: 'anchor' }],
  );
  assert.equal(pairs.length, 0);
});

test('auto pairs cap anchors to 2 when none are featured', () => {
  const pairs = buildAutoPairs(
    [
      makeTool('a', { verdict: 'ship', last_verified: '2026-09-04' }),
      makeTool('b', { verdict: 'ship', last_verified: '2026-09-03' }),
      makeTool('c', { verdict: 'ship', last_verified: '2026-09-02' }),
      makeTool('d', { verdict: 'ship', last_verified: '2026-09-01' }),
    ],
    [],
  );
  // Anchors = a, b (top 2). Rivals exclude anchors, so each pairs with c and d.
  const slugs = pairs.map((p) => `${p.a}-vs-${p.b}`).sort();
  assert.deepEqual(slugs, ['a-vs-c', 'a-vs-d', 'b-vs-c', 'b-vs-d']);
});

test('auto pairs prefer same verdict tier as anchor', () => {
  const pairs = buildAutoPairs(
    [
      makeTool('anchor', { verdict: 'ship', featured: true }),
      makeTool('same-tier', { verdict: 'ship', last_verified: '2026-08-01' }),
      makeTool('fresh-situational', { verdict: 'situational', last_verified: '2026-09-10' }),
      makeTool('fresh-skip', { verdict: 'skip', last_verified: '2026-09-11' }),
      makeTool('another-ship', { verdict: 'ship', last_verified: '2026-08-02' }),
      makeTool('yet-ship', { verdict: 'ship', last_verified: '2026-08-03' }),
    ],
    [],
  );
  // Up to 4 rivals; same-tier ship tools should win over situational/skip.
  const rivalIds = pairs.map((p) => p.b);
  assert.ok(rivalIds.includes('same-tier'));
  assert.ok(rivalIds.includes('another-ship'));
  assert.ok(rivalIds.includes('yet-ship'));
  assert.equal(rivalIds.includes('fresh-skip'), false);
});

test('auto pairs are deterministic', () => {
  const tools = [
    makeTool('anchor', { verdict: 'ship', featured: true }),
    makeTool('rival1', { verdict: 'ship' }),
    makeTool('rival2', { verdict: 'situational' }),
  ];
  const a = buildAutoPairs(tools, []);
  const b = buildAutoPairs(tools, []);
  assert.deepEqual(a, b);
});

test('auto pairs exclude radar tools', () => {
  const pairs = buildAutoPairs(
    [
      makeTool('anchor', { verdict: 'ship', featured: true }),
      makeTool('radar', { verdict: undefined }),
    ],
    [],
  );
  assert.equal(pairs.length, 0);
});

test('auto pairs skip self-pairs', () => {
  const pairs = buildAutoPairs(
    [makeTool('solo', { verdict: 'ship', featured: true })],
    [],
  );
  assert.equal(pairs.length, 0);
});

test('auto pairs apply global cap deterministically', () => {
  const tools = Array.from({ length: 40 }, (_, i) =>
    makeTool(`tool-${String(i).padStart(2, '0')}`, { verdict: 'ship' }),
  );
  // No featured tools, so top 2 anchors; 38 rivals split 4 each => 8 pairs.
  const uncapped = buildAutoPairs(tools, [], 120);
  assert.equal(uncapped.length, 8);

  // Cap below natural count should keep the first pairs in order.
  const capped = buildAutoPairs(tools, [], 3);
  assert.equal(capped.length, 3);
  assert.deepEqual(capped, uncapped.slice(0, 3));
});
