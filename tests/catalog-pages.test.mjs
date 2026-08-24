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
