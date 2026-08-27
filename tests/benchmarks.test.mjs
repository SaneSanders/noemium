import test from 'node:test';
import assert from 'node:assert/strict';
import { benchCounts, classifyBenchSource, collectBenches } from '../src/lib/benchmark-honesty.ts';

test('vendor chart is vendor, LiveBench is independent', () => {
  assert.equal(classifyBenchSource('vendor chart (Z.ai), no independent audit yet'), 'vendor');
  assert.equal(classifyBenchSource('Google model card'), 'vendor');
  assert.equal(classifyBenchSource('DeepSeek official changelog'), 'vendor');
  assert.equal(classifyBenchSource('official docs.z.ai'), 'vendor');
  assert.equal(classifyBenchSource('LiveBench 2026-08 https://livebench.ai'), 'independent');
  assert.equal(classifyBenchSource('a blog post'), 'unclear');
});

test('collect does not invent rows', () => {
  const rows = collectBenches([
    { slug: 'empty', name: 'Empty' },
    {
      slug: 'glm-5-3',
      name: 'GLM 5.3',
      benchmarks: [
        {
          name: 'Terminal-Bench 3.0',
          score: '28.3',
          source: 'vendor chart (Z.ai), no independent audit yet',
          date: '2026-08-14',
        },
      ],
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'vendor');
  assert.deepEqual(benchCounts(rows), { total: 1, independent: 0, vendor: 1, unclear: 0 });
});
