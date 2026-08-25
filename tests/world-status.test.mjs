import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCheckedAt, isDown, worldStatusBoard } from '../src/lib/world-status.ts';

const sample = {
  generated_at: '2026-08-25T10:00:00.000Z',
  counts: { pages: 2, down: 1, errors: 0 },
  pages: [
    {
      id: 'cf',
      name: 'Cloudflare',
      url: 'https://www.cloudflarestatus.com/',
      indicator: 'minor',
      description: 'Minor Service Outage',
      incidents: ['Increased Latency'],
      components: ['CDN/Cache'],
      error: null,
    },
    {
      id: 'openai',
      name: 'OpenAI',
      url: 'https://status.openai.com/',
      indicator: 'none',
      description: 'All Systems Operational',
      incidents: [],
      components: [],
      error: null,
    },
  ],
};

test('isDown ignores unknown and none', () => {
  assert.equal(isDown(sample.pages[0]), true);
  assert.equal(isDown(sample.pages[1]), false);
  assert.equal(isDown({ ...sample.pages[1], indicator: 'unknown', error: 'timeout' }), false);
});

test('worldStatusBoard splits down and quiet', () => {
  const board = worldStatusBoard(sample);
  assert.equal(board.down.length, 1);
  assert.equal(board.down[0].name, 'Cloudflare');
  assert.equal(board.up.length, 1);
  assert.equal(board.up[0].name, 'OpenAI');
});

test('formatCheckedAt is UTC and readable', () => {
  assert.equal(formatCheckedAt('2026-08-25T10:00:00.000Z'), '2026-08-25 10:00 UTC');
});
