import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function built(path) {
  const file = new URL(`dist/${path}`, root);
  assert.equal(existsSync(file), true, `missing built page: dist/${path}`);
  return readFileSync(file, 'utf8');
}

test('builds a skills index that is not a skills.sh scrape', () => {
  const html = built('skills/index.html');
  assert.match(html, /href="\/skills\/superpowers\/"/);
  assert.match(html, /Not a scrape of skills\.sh/);
  assert.match(html, /Graded/);
  assert.match(html, /Radar/);
});

test('builds the Superpowers skill page and OG art', () => {
  const html = built('skills/superpowers/index.html');
  assert.match(html, /Superpowers/);
  assert.match(html, /obra/);
  assert.equal(existsSync(new URL('dist/og/skills/superpowers.png', root)), true);
});

test('links Skills from reference and search', () => {
  const reference = built('reference/index.html');
  assert.match(reference, /href="\/skills\/"/);
  const index = JSON.parse(built('search-index.json'));
  assert.equal(index.skills.some((skill) => skill.slug === 'superpowers'), true);
});
