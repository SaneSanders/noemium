import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex } from '../src/data.ts';
import { check, checkText } from '../src/tools/check.ts';
import { fixture } from './fixtures.mjs';
import { loadRealSnapshot } from './real-snapshot.mjs';

const index = buildIndex(fixture);

const realIndex = buildIndex(await loadRealSnapshot());

const slugsOf = (result) => (result.candidates ?? []).map((c) => c.slug);

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
  assert.equal(result.candidates, undefined, 'nothing matched, so nothing to suggest');
});

test('a substring-only prefix is unknown with candidates, never ambiguous and never a verdict', () => {
  // Changed from the brief's `ambiguous` expectation. `ambiguous` now means
  // "two exact matches, pick one"; a mere substring is not a match at all, so
  // 'cla' is `unknown` and its hits are offered as suggestions.
  const [result] = check(index, ['cla']);
  assert.equal(result.status, 'unknown');
  assert.equal(result.verdict, undefined, 'a substring must never carry a verdict');
  assert.equal(result.slug, undefined);
  assert.ok(slugsOf(result).includes('claude-code'));
  assert.ok(slugsOf(result).includes('claude'));
  for (const candidate of result.candidates) {
    // 'model' joined 'tool'/'grave' when model cards became indexable, so
    // that `check` can answer for a model name instead of denying the card
    // exists. The assertion's point is unchanged: every candidate says what
    // kind of card it is.
    assert.ok(
      ['tool', 'grave', 'model'].includes(candidate.kind),
      `candidates carry kind, got ${candidate.kind}`,
    );
  }
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
  // tool's url host (claude.com) also normalizes to "claude". Tier 1 sees only
  // the name entry, so the query resolves to the "claude" card.
  const [result] = check(index, ['claude']);
  assert.equal(result.status, 'ship');
  assert.equal(result.slug, 'claude');
});

// --- Critical 1: a url host shared by many products must never yield a death ---

test('real catalog: "GitHub" is ambiguous, not the death of the one grave hosted there', () => {
  // The normalized key "github" holds 30 live tools plus the roo-code grave,
  // every one of them via: 'host'. Before the tier rewrite the lone grave
  // short-circuited the whole bucket and "GitHub" answered "DEAD Roo Code".
  const bucket = realIndex.byNormalizedName.get('github') ?? [];
  assert.ok(bucket.length > 8, `expected a crowded github bucket, got ${bucket.length}`);
  assert.ok(bucket.some((e) => e.kind === 'grave'), 'a grave must still be in the bucket');
  assert.ok(!bucket.some((e) => e.via === 'name'), 'no product is actually named "github"');

  for (const query of ['GitHub', 'github.com', 'https://github.com/RooCodeInc/Roo-Code']) {
    const [result] = check(realIndex, [query]);
    assert.notEqual(result.status, 'dead', `${query} must not report a death`);
    assert.equal(result.status, 'ambiguous', `${query} must be ambiguous`);
    assert.equal(result.verdict, undefined);
    assert.equal(result.slug, undefined);
    assert.equal(result.candidates.length, bucket.length);
    assert.ok(result.candidates.some((c) => c.kind === 'grave' && c.slug === 'roo-code'),
      'the dead candidate is still listed, marked as dead');
    for (const candidate of result.candidates) {
      // Model cards carry no url, so a host bucket can never hold one — but
      // the assertion accepts the same three kinds everywhere rather than
      // encoding that as a second rule.
      assert.ok(
        ['tool', 'grave', 'model'].includes(candidate.kind),
        `candidates carry kind, got ${candidate.kind}`,
      );
    }
  }
});

// --- Critical 2: substring matching has no authority to state a verdict ---

test('real catalog: "react" is unknown, never a borrowed SHIP verdict', () => {
  const [result] = check(realIndex, ['react']);
  assert.notEqual(result.status, 'ship', 'react must not inherit react-bits\' verdict');
  assert.equal(result.status, 'unknown');
  assert.equal(result.verdict, undefined);
  assert.equal(result.verdict_text, undefined);
  assert.equal(result.slug, undefined);
  assert.ok(slugsOf(result).includes('react-bits'), 'but it may suggest react-bits');
});

test('a two-letter substring of a card name is unknown, never that card\'s verdict', () => {
  for (const query of ['rs', 'urso']) {
    const [result] = check(index, [query]);
    assert.notEqual(result.status, 'ship', `${query} must not answer with Cursor's verdict`);
    assert.equal(result.status, 'unknown');
    assert.equal(result.slug, undefined);
    assert.deepEqual(slugsOf(result), ['cursor'], 'cursor is offered as a suggestion only');
  }
});

// --- Critical 3: grave-over-tool must not collapse a mixed substring set ---

test('a substring that touches a grave is unknown, not a death', () => {
  // 'code' substring-matches the claude-code tool and the roo-code grave.
  const [result] = check(index, ['code']);
  assert.notEqual(result.status, 'dead', 'a substring must never kill a product');
  assert.equal(result.status, 'unknown');
  const candidates = result.candidates;
  assert.ok(candidates.some((c) => c.slug === 'claude-code' && c.kind === 'tool'));
  assert.ok(candidates.some((c) => c.slug === 'roo-code' && c.kind === 'grave'),
    'the dead one is shown as a dead candidate, not as the answer');
});

test('real catalog: substring queries that used to answer DEAD now answer unknown', () => {
  for (const query of ['code', 'ide', 'art', 'flow']) {
    const [result] = check(realIndex, [query]);
    assert.equal(result.status, 'unknown', `${query} must not be a confident answer`);
    assert.equal(result.verdict, undefined);
  }
});

// --- The rulings that must NOT regress ---

test('real catalog: a genuine name-vs-name collision resolves as ambiguous, not a silent pick', () => {
  // Two known collisions in the real snapshot that `via` cannot break, because
  // both entries land in the bucket as via: 'name' (not name-vs-host):
  //   - normalized key "motion" -> tool slug "motion" (name "Motion (usemotion)")
  //                              and tool slug "motion-dev" (name "Motion")
  //   - normalized key "v0"     -> tool slug "v0" and tool slug "v0-dev"
  const motionEntries = realIndex.byNormalizedName.get('motion') ?? [];
  assert.ok(
    motionEntries.filter((e) => e.via === 'name').length >= 2,
    'expected the real catalog to still have a motion/motion-dev name collision; ' +
      `found ${JSON.stringify(motionEntries)}`,
  );

  for (const [query, expected] of [['Motion', ['motion', 'motion-dev']], ['v0', ['v0', 'v0-dev']]]) {
    const [result] = check(realIndex, [query]);
    assert.equal(result.status, 'ambiguous');
    for (const slug of expected) assert.ok(slugsOf(result).includes(slug), `${query} lists ${slug}`);
  }
});

test('real catalog: a death still wins where it should', () => {
  const [flowise] = check(realIndex, ['flowise']);
  assert.equal(flowise.status, 'dead');
  assert.equal(flowise.slug, 'flowise');
  assert.equal(flowise.verdict, undefined);

  const [rooCode] = check(realIndex, ['Roo Code']);
  assert.equal(rooCode.status, 'dead');
  assert.equal(rooCode.slug, 'roo-code');
  assert.equal(rooCode.succeeded_by, 'Roomote');
});

// --- Fix round 2: a death needs a name/slug match, never a bare host ---

test('real catalog: "Microsoft" is not the death of the Cortana grave hosted there', () => {
  // The graveyard entry for Microsoft Cortana carries url
  // "https://www.microsoft.com/en-us/windows/cortana"; its host normalizes to
  // "microsoft", which is otherwise nobody's name or slug. That is exactly one
  // via: 'host' entry — weak evidence a company died, not proof. The honest
  // answer is `unknown`, with the grave still surfaced as a candidate.
  const bucket = realIndex.byNormalizedName.get('microsoft') ?? [];
  assert.equal(bucket.length, 1, `expected a single host-only hit, got ${JSON.stringify(bucket)}`);
  assert.equal(bucket[0].via, 'host');
  assert.equal(bucket[0].kind, 'grave');

  const [result] = check(realIndex, ['Microsoft']);
  assert.notEqual(result.status, 'dead', 'a bare host must never declare a death');
  assert.equal(result.status, 'unknown');
  assert.equal(result.slug, undefined);
  assert.ok(
    result.candidates?.some((c) => c.slug === 'microsoft-cortana' && c.kind === 'grave'),
    'the grave is still offered as a candidate, just not asserted as fact',
  );
});

test('real catalog: a host-only match on a LIVE card still answers with its verdict', () => {
  // Proves the round-2 rule is about evidence, not a special case carved out
  // for Microsoft. "aider.chat" is aider's url host ("aider.chat" is not a
  // recognized TLD suffix here, so it survives normalization whole) and does
  // not collide with any product's own name/slug — a genuine via: 'host'
  // single hit, same shape as the Microsoft case, but landing on a live tool.
  // That must resolve exactly as before: the tool's real verdict, not 'unknown'.
  const bucket = realIndex.byNormalizedName.get('aiderchat') ?? [];
  assert.equal(bucket.length, 1, `expected a single host-only hit, got ${JSON.stringify(bucket)}`);
  assert.equal(bucket[0].via, 'host');
  assert.equal(bucket[0].kind, 'tool');

  const [result] = check(realIndex, ['aider.chat']);
  assert.equal(result.status, 'ship');
  assert.equal(result.slug, 'aider');
  assert.equal(result.verdict, 'ship');
});

// --- Rendering ---

test('a radar card carries no verdict text, in the result or the rendered line', () => {
  const [result] = check(realIndex, ['relay.app']);
  assert.equal(result.status, 'radar');
  assert.equal(result.verdict, undefined);
  assert.equal(result.verdict_text, undefined, 'a radar card must not leak an endorsement');
  assert.match(checkText([result]), /^relay\.app — RADAR \(on the map, no verdict yet/);
});

test('checkText never renders a dangling em dash when verdict_text is missing', () => {
  const text = checkText([
    { query: 'ghost', status: 'ship', last_verified: '2026-09-01', url: 'https://noemium.com/tools/ghost/' },
  ]);
  assert.equal(text, 'ghost — SHIP (verified 2026-09-01) · https://noemium.com/tools/ghost/');
  assert.doesNotMatch(text, /— ·/, 'no empty verdict slot');
});

test('checkText caps a long candidate list at 8 and marks the dead ones', () => {
  const [result] = check(realIndex, ['GitHub']);
  const line = checkText([result]);
  assert.match(line, /^GitHub — AMBIGUOUS\. Did you mean: /);
  assert.match(line, new RegExp(`\\+${result.candidates.length - 8} more`));
  assert.equal(line.split(', ').length, 9, '8 candidates plus the "+N more" tail');

  const dead = checkText([check(index, ['code'])[0]]);
  assert.match(dead, /roo-code \(dead\)/, 'dead candidates are marked plainly');
  assert.match(dead, /Near matches \(names only, not verdicts\)/);
});
