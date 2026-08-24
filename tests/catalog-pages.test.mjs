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
});

test('contribute stays a PR vitrine', () => {
  const html = built('contribute/index.html');
  assert.match(html, /Open pull requests/);
  assert.match(html, /Adopt-a-page issues/);
  assert.match(html, /unit is a pull request/i);
  assert.match(html, /no contributor badges/i);
  assert.match(html, /not a\s+leaderboard/i);
  assert.doesNotMatch(html, /upvote|karma points|contributor rank/i);
});

test('footer and llms expose the new surfaces', () => {
  const home = built('index.html');
  assert.match(home, /href="\/status\/"/);
  assert.match(home, /href="\/kit\/"/);
  assert.match(home, /href="\/why\/"/);
  const llms = built('llms.txt');
  assert.match(llms, /noemium.com\/status\//);
  assert.match(llms, /noemium.com\/kit\//);
  assert.match(llms, /noemium.com\/why\//);
});

test('a featured ship card renders the briefing grid', () => {
  const html = built('tools/chatgpt/index.html');
  assert.match(html, />Strengths</);
  assert.match(html, />Use it when</);
  assert.match(html, />Skip it when</);
  assert.match(html, /Add to kit/);
});

test('verified page renders the tested shelf', () => {
  const html = built('verified/index.html');
  assert.match(html, />Tested shelf</);
  assert.match(html, /published test protocol/i);
  assert.match(html, /cursor/i);
  assert.match(html, />person</);
  assert.match(html, /2026-08-24/);
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
