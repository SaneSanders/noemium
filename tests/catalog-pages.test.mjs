import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function built(path) {
  const file = new URL(`dist/${path}`, root);
  assert.equal(existsSync(file), true, `missing built file: dist/${path}`);
  return readFileSync(file, 'utf8');
}

test('status, kit and why ship without stars, votes or live tickers', () => {
  const status = built('status/index.html');
  assert.match(status, /Snapshotted at build/);
  assert.match(status, /ship cards briefed/);
  assert.match(status, /paid placements/);
  assert.match(status, /not a live vendor ticker/i);
  assert.doesNotMatch(status, /product hunt/i);

  const kit = built('kit/index.html');
  assert.match(kit, /not a budget/i);
  assert.match(kit, /do not sum monthly prices/i);
  assert.match(kit, /not a fake monthly total/i);
  assert.doesNotMatch(kit, /\$\/mo total/);

  const why = built('why/index.html');
  assert.match(why, /Why directories lie/);
  assert.match(why, /unit is a pull request/);
  assert.doesNotMatch(why, /vote for us|leave a star/i);

  const footer = built('tools/index.html');
  assert.match(footer, /href="\/free\/"/);
});

test('kit page links to its OG image and the image is emitted', () => {
  const kit = built('kit/index.html');
  assert.match(kit, /og\/kit\.png/);
  assert.equal(existsSync(new URL('dist/og/kit.png', root)), true);
});

test('graveyard renders at least ten exhibits including Kite, Galactica and Humane', () => {
  const html = built('graveyard/index.html');
  assert.match(html, /Kite/);
  assert.match(html, /Galactica/);
  assert.match(html, /Humane/);
  assert.match(html, /1[0-9] tools confirmed dead/);
});

test('/money/ renders the affiliate ledger', () => {
  const html = built('money/index.html');
  assert.match(html, /Money/);
  assert.match(html, /Make/);
  assert.match(html, /cards carry an affiliate link/);
});

test('contribute stays a PR vitrine', () => {
  const html = built('contribute/index.html');
  assert.match(html, /Open pull requests/);
  assert.match(html, /Adopt-a-page issues/);
  assert.match(html, /unit is a pull request/i);
  assert.match(html, /no contributor badges/i);
  assert.match(html, /not a\s+leaderboard/i);
  assert.match(html, /Start by disputing/i);
  assert.doesNotMatch(html, /upvote|karma points|contributor rank/i);
});

test('tool page exposes Dispute this verdict copy prompt', () => {
  const html = built('tools/cursor/index.html');
  assert.match(html, /Dispute this verdict/);
  assert.match(html, /noemium:\/\/new\?/);
  assert.match(html, /Open in Noemium/);
});

test('radar tool page disputes the listing, not a fake verdict', () => {
  const html = built('tools/continue-dev/index.html');
  assert.match(html, /Dispute this listing/);
  assert.match(html, /Radar · no verdict/);
  assert.doesNotMatch(html, /Dispute this verdict/);
});

test('floor guide renders on a graded automation card', () => {
  const html = built('tools/n8n/index.html');
  assert.match(html, /Floor guide/);
});

test('tool page renders Models row with resolved names and routing badge', () => {
  const html = built('tools/cursor/index.html');
  assert.match(html, /Models/);
  assert.match(html, /Claude Sonnet 5/);
  assert.match(html, /bundled/);
});

test('llms.txt curates verified shelf and links to full dump', () => {
  const llms = built('llms.txt');
  assert.match(llms, /Verified shelf/);
  assert.match(llms, /## Jobs/);
  assert.match(llms, /llms-full\.txt/);
});

test('llms-full.txt carries desk-research disclaimer', () => {
  const full = built('llms-full.txt');
  assert.match(full, /desk research, not field evidence/);
});

test('footer exposes status, kit and why surfaces', () => {
  const tools = built('tools/index.html');
  assert.match(tools, /href="\/status\/"/);
  assert.match(tools, /href="\/kit\/"/);
  assert.match(tools, /href="\/why\/"/);
});

test('a featured ship card renders the briefing grid', () => {
  const html = built('tools/chatgpt/index.html');
  assert.match(html, />Strengths</);
  assert.match(html, />Use it when</);
  assert.match(html, />Skip it when</);
  assert.match(html, /Add to kit/);
});

test('verified page renders the field-tested shelf honestly', () => {
  const html = built('verified/index.html');
  assert.match(html, />Verified shelf</);
  assert.match(html, /Field-tested cards only/);
  assert.match(html, /0 of/);
});

test('models index surfaces retirement with successor link', () => {
  const html = built('models/index.html');
  assert.match(html, /Retiring 2026-08-31/);
  assert.match(html, /mistral-medium-3-5/);
  assert.match(html, /Mistral Medium 3\.5/);
});

test('price tape renders with disclaimer and honest empty state if no movers', () => {
  const html = built('prices/index.html');
  assert.match(html, />Price tape</);
  assert.match(html, /not a live vendor ticker/i);
  // Current fixture has movers; if it ever empties, the honest "No moves recorded yet" block renders.
  assert.match(html, /No moves recorded yet|per 1M in\/out/);
});

test('ship tool page renders buy-check, data sensitivity, and archive snapshots', () => {
  const html = built('tools/cursor/index.html');
  assert.match(html, />Buy-check</);
  assert.match(html, /Price<\/span>\s*—/);
  assert.match(html, /Free tier exists/);
  assert.match(html, /trains on inputs/);
  assert.match(html, /web\.archive\.org\/web\/2026\//);
  assert.match(html, /\[snapshot\]/);
});

test('jobs index and detail pages render with recommended pick and skips', () => {
  const index = built('jobs/index.html');
  assert.match(index, /One job, one recommendation, honest skips/);
  assert.match(index, /Meeting notes/);
  assert.match(index, /Code assist/);
  assert.match(index, /Image generation/);
  assert.match(index, /Founder solo writing/);
  assert.match(index, /href="\/jobs\/code-assist\/"/);

  const detail = built('jobs/code-assist/index.html');
  assert.match(detail, /Code assist/);
  assert.match(detail, /Recommended/);
  assert.match(detail, /Cursor/);
  assert.match(detail, /Honest skips/);
  assert.match(detail, /Check manually/);
  assert.match(detail, /href="\/jobs\/"/);
});

test('compare pair page renders The call from card data', () => {
  const html = built('tools/compare/cursor-vs-claude-code/index.html');
  assert.match(html, /The call/);
  assert.match(html, /Pick Cursor if/);
  assert.match(html, /Pick Claude Code for terminal-native agents/);
});

test('compare index surfaces Real conflicts', () => {
  const html = built('tools/compare/index.html');
  assert.match(html, /Real conflicts/);
  assert.match(html, /href="\/tools\/compare\/cursor-vs-claude-code\/"/);
});

test('rss feed only contains weeks with risk events', () => {
  const rss = built('rss.xml');
  const changelog = JSON.parse(readFileSync(new URL('../src/data/changelog.json', import.meta.url), 'utf8'));
  const riskWeeks = changelog.weeks.filter((w) => (w.risk ?? []).length > 0);
  const itemCount = (rss.match(/<item>/g) ?? []).length;
  assert.equal(itemCount, riskWeeks.length, 'RSS item count should match weeks with risk');
  // The feed should not contain the old full-diff title format.
  assert.doesNotMatch(rss, /catalog diff: \+\d+ \/ −\d+ \/ ~\d+/);
});

test('api/graveyard.json exposes every graveyard entry with a receipt', () => {
  const raw = built('api/graveyard.json');
  const payload = JSON.parse(raw);
  assert.ok(payload.count >= 14, 'graveyard should have at least 14 entries');
  assert.equal(payload.count, payload.graveyard.length);
  const flowise = payload.graveyard.find((entry) => entry.slug === 'flowise');
  assert.ok(flowise, 'flowise must be in the graveyard payload');
  assert.equal(flowise.died, '2026-08-31');
  assert.ok(flowise.receipt.startsWith('http'), 'every entry needs a receipt URL');
  for (const entry of payload.graveyard) {
    assert.ok(entry.slug && entry.name && entry.died, `incomplete entry: ${entry.slug}`);
  }
});
