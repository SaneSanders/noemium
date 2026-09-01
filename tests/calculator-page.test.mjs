import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function built(path) {
  const file = new URL(`dist/${path}`, root);
  assert.equal(existsSync(file), true, `missing built file: dist/${path}`);
  return readFileSync(file, 'utf8');
}

test('calculator page exists with honest total copy', () => {
  const html = built('calculator/index.html');
  assert.match(html, /Stack math/);
  assert.match(html, /Known monthly dollars/);
  assert.match(html, /Seats carry vendor receipts; API is list-rate arithmetic on your volume, not a usage measurement/);
});

test('calculator page lists a real seat and a receipt hostname', () => {
  const html = built('calculator/index.html');
  assert.match(html, /Claude Code|ChatGPT|Cursor/);
  assert.match(html, /support\.claude\.com|learn\.chatgpt\.com|cursor\.com/);
});

test('calculator page includes the seat and API blocks', () => {
  const html = built('calculator/index.html');
  assert.match(html, /Seats/);
  assert.match(html, /API at list/);
  assert.match(html, /Add API line/);
});
