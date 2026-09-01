import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function built(path) {
  const file = new URL(`dist/${path}`, root);
  assert.equal(existsSync(file), true, `missing built file: dist/${path}`);
  return readFileSync(file, 'utf8');
}

test('ship badge renders with the ship color', () => {
  const svg = built('badge/cursor.svg');
  assert.match(svg, /<svg/);
  assert.match(svg, />NOEMIUM</);
  assert.match(svg, />SHIP</);
  assert.match(svg, /#2FA36B/i);
  assert.match(svg, /aria-label="Noemium verdict: ship"/);
});

test('situational and skip badges use their own colors', () => {
  const situational = built('badge/tencent-codebuddy.svg');
  assert.match(situational, />SITUATIONAL</);
  assert.match(situational, /#D19A2E/i);
  const skip = built('badge/cody.svg');
  assert.match(skip, />SKIP</);
  assert.match(skip, /#E0593F/i);
});

test('radar tools get no verdict badge', () => {
  assert.equal(existsSync(new URL('dist/badge/notion.svg', root)), false);
});

test('verdicted tool pages ship the embed snippet', () => {
  const html = built('tools/cursor/index.html');
  assert.match(html, /Embed verdict/);
  assert.match(html, /badge\/cursor\.svg/);
});

test('radar tool pages do not ship the embed snippet', () => {
  const html = built('tools/notion/index.html');
  assert.doesNotMatch(html, /Embed verdict/);
});
