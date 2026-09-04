import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, siteUrl, buildIndex } from '../src/data.ts';
import { fixture } from './fixtures.mjs';

test('normalizeName strips punctuation, spacing and common TLDs', () => {
  assert.equal(normalizeName('Roo Code'), 'roocode');
  assert.equal(normalizeName('cursor.com'), 'cursor');
  assert.equal(normalizeName('  Claude-Code  '), 'claudecode');
  assert.equal(normalizeName('elevenlabs.io'), 'elevenlabs');
  assert.equal(normalizeName('n8n'), 'n8n');
});

test('siteUrl builds noemium.com links per kind', () => {
  assert.equal(siteUrl('tool', 'cursor'), 'https://noemium.com/tools/cursor/');
  assert.equal(siteUrl('stack', 'solo-coding'), 'https://noemium.com/stacks/solo-coding/');
  assert.equal(siteUrl('grave', 'flowise'), 'https://noemium.com/graveyard/');
  assert.equal(siteUrl('model', 'claude-fable-5'), 'https://noemium.com/models/');
});

test('buildIndex maps slugs and normalized names, including hosts', () => {
  const index = buildIndex(fixture);
  assert.equal(index.toolBySlug.get('cursor').name, 'Cursor');
  assert.equal(index.graveBySlug.get('flowise').died, '2026-08-31');
  // cursor's slug, name and url host (cursor.com -> cursor) all normalize to the
  // same key and collapse to one entry, matched via its name/slug.
  assert.deepEqual(index.byNormalizedName.get('cursor'), [{ kind: 'tool', slug: 'cursor', via: 'name' }]);
  assert.deepEqual(index.byNormalizedName.get('roocode'), [{ kind: 'grave', slug: 'roo-code', via: 'name' }]);
  assert.ok(index.byNormalizedName.has('klingai'), 'host of kling url should be indexed');
  const klingHost = index.byNormalizedName.get('klingai');
  assert.deepEqual(klingHost, [{ kind: 'tool', slug: 'kling', via: 'host' }]);
});

test('name/slug hits are distinguishable from host hits on a collision', () => {
  // The "claude" tool (slug/name "claude") and the "claude-code" tool (url
  // https://claude.com/claude-code, whose host normalizes to "claude") both
  // land on the normalized key "claude". A lookup must be able to tell them
  // apart via `via`, and prefer the exact name/slug match over the host match.
  const index = buildIndex(fixture);
  const entries = index.byNormalizedName.get('claude');
  assert.ok(entries, 'normalized key "claude" must be indexed');
  assert.equal(entries.length, 2, 'both the claude tool and claude-code host must be present');

  const nameHit = entries.find((e) => e.via === 'name');
  assert.deepEqual(nameHit, { kind: 'tool', slug: 'claude', via: 'name' });

  const hostHit = entries.find((e) => e.via === 'host');
  assert.deepEqual(hostHit, { kind: 'tool', slug: 'claude-code', via: 'host' });
});
