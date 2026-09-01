import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrackRecord, parseFlips, parseBurials } from '../scripts/track-record.mjs';

const record = buildTrackRecord();

test('yi-api flip is recorded (situational → skip)', () => {
  const flip = record.flips.find((f) => f.slug === 'yi-api' && f.from === 'situational' && f.to === 'skip');
  assert.ok(flip, 'expected yi-api situational→skip flip');
  assert.equal(flip.collection, 'tools');
  assert.ok(flip.date, 'flip has a date');
  assert.ok(flip.hash.length === 40, 'full hash present');
  assert.ok(flip.subject.length > 0, 'subject present');
});

test('flowise burial is recorded on 2026-09-01', () => {
  const burial = record.burials.find((b) => b.slug === 'flowise');
  assert.ok(burial, 'expected flowise burial');
  assert.equal(burial.name, 'Flowise');
  assert.equal(burial.date, '2026-09-01');
  assert.equal(burial.died, '2026-08-31');
});

test('no flip has from equal to to', () => {
  for (const flip of record.flips) {
    assert.notEqual(flip.from, flip.to, `${flip.slug} flip has distinct from/to`);
  }
});

test('parseFlips ignores new cards and unchanged verdicts', () => {
  // A synthetic block with only +verdict (new card) and same-value change should produce no flips.
  const synthetic =
    '0000000000000000000000000000000000000000\t2026-08-15\tcreate card\n' +
    'diff --git a/src/content/tools/foo.yaml b/src/content/tools/foo.yaml\n' +
    '--- /dev/null\n' +
    '+++ b/src/content/tools/foo.yaml\n' +
    '@@ -0,0 +1 @@\n' +
    '+verdict: ship\n' +
    'diff --git a/src/content/tools/bar.yaml b/src/content/tools/bar.yaml\n' +
    '--- a/src/content/tools/bar.yaml\n' +
    '+++ b/src/content/tools/bar.yaml\n' +
    '@@ -1 +1 @@\n' +
    '-verdict: ship\n' +
    '+verdict: ship\n';
  const flips = parseFlips(synthetic, 'tools');
  assert.equal(flips.length, 0);
});

test('parseFlips detects a verdict change within one commit', () => {
  const synthetic =
    '1111111111111111111111111111111111111111\t2026-08-20\taudit\n' +
    'diff --git a/src/content/tools/baz.yaml b/src/content/tools/baz.yaml\n' +
    '--- a/src/content/tools/baz.yaml\n' +
    '+++ b/src/content/tools/baz.yaml\n' +
    '@@ -1 +1 @@\n' +
    '-verdict: situational\n' +
    '+verdict: skip\n';
  const flips = parseFlips(synthetic, 'tools');
  assert.equal(flips.length, 1);
  assert.deepEqual(flips[0], {
    collection: 'tools',
    slug: 'baz',
    from: 'situational',
    to: 'skip',
    date: '2026-08-20',
    shortHash: '1111111',
    subject: 'audit',
    hash: '1111111111111111111111111111111111111111',
  });
});

test('parseBurials reads graveyard additions from name-status output', () => {
  const synthetic =
    '2222222222222222222222222222222222222222\t2026-09-01\tburial batch\n' +
    'A\tsrc/content/graveyard/flowise.yaml\n' +
    'A\tsrc/content/graveyard/roo-code.yaml\n';
  const burials = parseBurials(synthetic);
  assert.equal(burials.length, 2);
  assert.ok(burials.some((b) => b.slug === 'flowise'));
  assert.ok(burials.some((b) => b.slug === 'roo-code'));
});
