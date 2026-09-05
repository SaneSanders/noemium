import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { loadRealSnapshot } from './real-snapshot.mjs';

const root = new URL('../../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

test('snapshot counts match the site API payloads', async () => {
  const snapshot = await loadRealSnapshot();
  const [tools, models, stacks, graveyard] = await Promise.all([
    readJson('dist/api/tools.json'),
    readJson('dist/api/models.json'),
    readJson('dist/api/stacks.json'),
    readJson('dist/api/graveyard.json'),
  ]);
  assert.equal(snapshot.counts.tools, tools.count);
  assert.equal(snapshot.counts.models, models.count);
  assert.equal(snapshot.counts.stacks, stacks.count);
  assert.equal(snapshot.counts.graveyard, graveyard.count);
  assert.equal(snapshot.tools.length, tools.count);
  assert.match(snapshot.built, /^\d{4}-\d{2}-\d{2}$/);
});

test('every tool carries last_verified and alternatives', async () => {
  const snapshot = await loadRealSnapshot();
  for (const tool of snapshot.tools) {
    assert.ok(tool.slug, 'tool needs a slug');
    assert.ok(tool.last_verified, `${tool.slug} missing last_verified`);
    assert.ok(Array.isArray(tool.alternatives), `${tool.slug} missing alternatives`);
    assert.ok(tool.alternatives.length <= 6, `${tool.slug} has too many alternatives`);
    assert.ok(!tool.alternatives.includes(tool.slug), `${tool.slug} lists itself`);
  }
});

test('cursor resolves alternatives from its job peers', async () => {
  const snapshot = await loadRealSnapshot();
  const cursor = snapshot.tools.find((t) => t.slug === 'cursor');
  assert.ok(cursor, 'cursor card must exist');
  assert.equal(cursor.verdict, 'ship');
  assert.ok(cursor.alternatives.includes('claude-code'), 'cursor peers include claude-code');
});

test('flowise is in the graveyard with a death date', async () => {
  const snapshot = await loadRealSnapshot();
  const flowise = snapshot.graveyard.find((entry) => entry.slug === 'flowise');
  assert.ok(flowise, 'flowise must be present');
  assert.equal(flowise.died, '2026-08-31');
});
