import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function built(path) {
  const file = new URL(`dist/${path}`, root);
  assert.equal(existsSync(file), true, `missing built file: dist/${path}`);
  return readFileSync(file, 'utf8');
}

const packFiles = [
  'pack/inbox-desk/README.md',
  'pack/inbox-desk/SOP.md',
  'pack/inbox-desk/profiles/inbox.md',
  'pack/inbox-desk/profiles/qual.md',
  'pack/inbox-desk/profiles/closer-lite.md',
];

test('builds Inbox Desk at /pack/ and copies the markdown', () => {
  const html = built('pack/index.html');
  assert.match(html, /Inbox Desk/);
  assert.match(html, /The agent drafts/);
  assert.match(html, /A human sends/);
  assert.match(html, /href="\/pack\/inbox-desk\/README\.md"/);
  assert.match(html, /href="\/pack\/inbox-desk\/SOP\.md"/);
  assert.match(html, /href="\/pack\/inbox-desk\/profiles\/inbox\.md"/);
  assert.match(html, /href="\/pack\/inbox-desk\/profiles\/qual\.md"/);
  assert.match(html, /href="\/pack\/inbox-desk\/profiles\/closer-lite\.md"/);
  for (const path of packFiles) {
    const body = built(path);
    assert.match(body, /Inbox Desk|Inbox|Qual|Closer-lite/);
    assert.doesNotMatch(body, /[\u0400-\u04FF]/);
  }
});

test('Inbox Desk page stays a free-to-read studio SKU', () => {
  const html = built('pack/index.html');
  assert.doesNotMatch(html, /product hunt/i);
  assert.doesNotMatch(html, /buy now|add to cart|checkout/i);
  assert.doesNotMatch(html, /offers|priceCurrency|unit_price/i);
  assert.match(html, /isAccessibleForFree/);
  assert.match(built('index.html'), /href="\/pack\/"/);
});
