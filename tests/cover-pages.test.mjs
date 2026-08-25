import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function built(path) {
  const file = new URL(`dist/${path}`, root);
  assert.equal(existsSync(file), true, `missing built file: dist/${path}`);
  return readFileSync(file, 'utf8');
}

function mastDoors(html) {
  assert.match(html, /href="\/map\/"/);
  assert.match(html, /href="\/autopsy\/"/);
  assert.match(html, /href="\/signals\/"/);
  assert.match(html, /href="\/reference\/"/);
  assert.match(html, /href="\/method\/"/);
}

test('cover home is the night hero, not the old floor', () => {
  const html = built('index.html');
  assert.match(html, /Bring/);
  assert.match(html, /the frontier/i);
  assert.match(html, /nema-color\.png/);
  assert.match(html, /Open the map/);
  assert.match(html, /Cut your stack open/);
  assert.doesNotMatch(html, /Agent Field Guide/);
  mastDoors(html);
});

test('map page ships the scene and the data dump', () => {
  const html = built('map/index.html');
  assert.match(html, /id="scene"/);
  assert.match(html, /Height = how settled it is/);
  mastDoors(html);
  const data = JSON.parse(built('api/map.json'));
  assert.ok(data.counts.tools > 200);
  assert.ok(data.nodes.length > 200);
  assert.ok(data.stars.length > 10);
});

test('autopsy door is honest about the missing engine', () => {
  const html = built('autopsy/index.html');
  assert.match(html, /not on this build/i);
  assert.doesNotMatch(html, /Paid, with a free shelf/);
  mastDoors(html);
});

test('reference is the catalogue facade', () => {
  const html = built('reference/index.html');
  assert.match(html, /href="\/tools\/"/);
  assert.match(html, /href="\/graveyard\/"/);
  mastDoors(html);
});

test('method door is a cover document', () => {
  const html = built('method/index.html');
  assert.match(html, /cover-night/);
  assert.match(html, /The ledger/);
  assert.match(html, /not the vibe/i);
  mastDoors(html);
});

test('catalog titles are sentence-case Fraunces, not slab uppercase', () => {
  const cursor = built('tools/cursor/index.html');
  assert.match(cursor, /<h1[^>]*>Cursor<\/h1>/);
  assert.doesNotMatch(cursor, /<h1 class="[^"]*uppercase/);
  const tools = built('tools/index.html');
  assert.doesNotMatch(tools, /<h1 class="[^"]*uppercase/);
  const grave = built('graveyard/index.html');
  assert.doesNotMatch(grave, /<h2 class="[^"]*uppercase/);
});
