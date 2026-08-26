import test from 'node:test';
import assert from 'node:assert/strict';
import { kitHref, mergeKit, parseKitSlugs } from '../src/lib/kit.ts';
import { openInNoemiumHref } from '../src/lib/open-app.ts';
import { catalogHealth, hasBriefing } from '../src/lib/catalog-health.ts';

test('kit parser keeps allowed slugs, drops junk, caps at eight', () => {
  const allowed = ['cursor', 'claude-code', 'chatgpt', 'midjourney', 'runway'];
  assert.deepEqual(parseKitSlugs('cursor,unknown,claude-code,cursor', allowed), [
    'cursor',
    'claude-code',
  ]);
  assert.deepEqual(
    parseKitSlugs('a,b,c,d,e,f,g,h,i', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']),
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  );
});

test('openInNoemiumHref is a new-project deep link, not a web URL', () => {
  const href = openInNoemiumHref('Studio stack', 'ship the catalog');
  assert.match(href, /^noemium:\/\/new\?/);
  assert.match(href, /name=Studio/);
  assert.match(href, /goal=ship/);
  assert.doesNotMatch(href, /^https?:/);
});

test('kit merge appends from add= without inventing a monthly total', () => {
  const allowed = ['cursor', 'chatgpt'];
  assert.deepEqual(mergeKit(['cursor'], ['chatgpt'], allowed), ['cursor', 'chatgpt']);
  assert.equal(kitHref(['cursor', 'chatgpt']), '/kit/?tools=cursor,chatgpt');
  assert.equal(kitHref([]), '/kit/');
});

test('catalog health counts briefings and homepage-only receipts', () => {
  const health = catalogHealth(
    [
      {
        id: 'cursor',
        name: 'Cursor',
        verdict: 'ship',
        last_verified: '2026-08-19',
        featured: true,
        receipts: ['https://cursor.com/pricing'],
        strengths: ['A', 'B'],
        use_for: ['A', 'B'],
        skip_when: ['A', 'B'],
      },
      {
        id: 'old',
        name: 'Old',
        verdict: 'situational',
        last_verified: '2026-01-01',
        receipts: ['https://example.com/'],
      },
    ],
    '2026-08-23',
  );
  assert.equal(health.ship, 1);
  assert.equal(health.shipBriefed, 1);
  assert.equal(health.shipUnbriefed.length, 0);
  assert.equal(health.stale.map((t) => t.id).join(), 'old');
  assert.equal(health.homepageOnly.map((t) => t.id).join(), 'old');
  assert.equal(hasBriefing({ strengths: ['A', 'B'] }), false);
});
