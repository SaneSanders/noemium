import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildIndex } from '../src/data.ts';
import { check, checkText } from '../src/tools/check.ts';
import { fixture } from './fixtures.mjs';

const index = buildIndex(fixture);

test('a dead tool reports death date and successor', () => {
  const [result] = check(index, ['flowise']);
  assert.equal(result.status, 'dead');
  assert.equal(result.died, '2026-08-31');
  assert.equal(result.succeeded_by, undefined, 'flowise has no successor');
  assert.equal(result.url, 'https://noemium.com/graveyard/');
});

test('a dead tool with a successor names it', () => {
  const [result] = check(index, ['Roo Code']);
  assert.equal(result.status, 'dead');
  assert.equal(result.succeeded_by, 'Roomote');
});

test('a shipping tool reports its verdict with a card url', () => {
  const [result] = check(index, ['Cursor']);
  assert.equal(result.status, 'ship');
  assert.equal(result.slug, 'cursor');
  assert.equal(result.last_verified, '2026-09-01');
  assert.equal(result.url, 'https://noemium.com/tools/cursor/');
});

test('a hostname resolves to its card', () => {
  const [result] = check(index, ['cursor.com']);
  assert.equal(result.slug, 'cursor');
});

test('an unknown name is unknown, never a guess', () => {
  const [result] = check(index, ['totally-made-up-tool']);
  assert.equal(result.status, 'unknown');
  assert.equal(result.slug, undefined);
  assert.equal(result.verdict, undefined);
});

test('a prefix that matches several cards is ambiguous with candidates', () => {
  // 'cl' would not actually be ambiguous against the fixture (no exact bucket,
  // and substring-matching keys collapse to a single tool). 'cla' genuinely
  // substring-matches both the "claude" and "claude-code" normalized keys.
  const [result] = check(index, ['cla']);
  assert.equal(result.status, 'ambiguous');
  assert.ok(result.candidates.length >= 2, 'ambiguous results list candidates');
  assert.ok(result.candidates.includes('claude-code'));
  assert.ok(result.candidates.includes('claude'));
});

test('checkText renders one honest line per name', () => {
  const text = checkText(check(index, ['flowise', 'cursor', 'nope']));
  assert.match(text, /flowise — DEAD 2026-08-31/);
  assert.match(text, /cursor — SHIP/);
  assert.match(text, /nope — UNKNOWN/);
  assert.match(text, /https:\/\/noemium\.com\/tools\/cursor\//);
});

test('an exact name match beats a colliding url-host match (claude vs claude-code)', () => {
  // The "claude" tool's slug/name normalize to "claude"; the "claude-code"
  // tool's url host (claude.com) also normalizes to "claude". A query for
  // the exact name "claude" must resolve to the "claude" card, not read as
  // ambiguous against claude-code's host collision.
  const [result] = check(index, ['claude']);
  assert.equal(result.status, 'ship');
  assert.equal(result.slug, 'claude');
});

test('real catalog: a genuine name-vs-name collision resolves as ambiguous, not a silent pick', async () => {
  // Two known collisions in the real snapshot that `via` cannot break, because
  // both entries land in the bucket as via: 'name' (not name-vs-host):
  //   - normalized key "motion" -> tool slug "motion" (name "Motion (usemotion)")
  //                              and tool slug "motion-dev" (name "Motion")
  //   - normalized key "v0"     -> tool slug "v0" and tool slug "v0-dev"
  // Verified directly against mcp/data/snapshot.json before writing this test.
  const raw = await readFile(new URL('../data/snapshot.json', import.meta.url), 'utf8');
  const snapshot = JSON.parse(raw);
  const realIndex = buildIndex(snapshot);

  const motionEntries = realIndex.byNormalizedName.get('motion') ?? [];
  const motionNameHits = motionEntries.filter((e) => e.via === 'name');
  assert.ok(
    motionNameHits.length >= 2,
    'expected the real catalog to still have a motion/motion-dev name collision; ' +
      `found ${JSON.stringify(motionEntries)}`,
  );

  const [result] = check(realIndex, ['Motion']);
  assert.equal(result.status, 'ambiguous');
  assert.ok(result.candidates.includes('motion'));
  assert.ok(result.candidates.includes('motion-dev'));
});
