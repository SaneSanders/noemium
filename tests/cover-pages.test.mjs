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
  assert.match(html, /href="\/reference\/"/);
  assert.match(html, /href="\/method\/"/);
}

test('cover home is the night hero, not the old floor', () => {
  const html = built('index.html');
  assert.match(html, /Bring/);
  assert.match(html, /the frontier/i);
  assert.match(html, /nema-final-cut\.png/);
  assert.match(html, />Map</);
  assert.match(html, />Autopsy</);
  assert.match(html, />Catalog</);
  assert.match(html, />Method</);
  assert.doesNotMatch(html, />Signals</);
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

test('autopsy ships the stack autopsy engine', () => {
  const html = built('autopsy/index.html');
  assert.match(html, /Your stack,.*opened up/i);
  assert.match(html, /Cut it open/);
  assert.match(html, /application\/json/);
  mastDoors(html);
});

test('reference is the catalogue facade', () => {
  const html = built('reference/index.html');
  assert.match(html, /href="\/tools\/"/);
  assert.match(html, /href="\/graveyard\/"/);
  assert.match(html, /href="\/free\/"/);
  mastDoors(html);
});

test('free page splits bait from actually free, from catalog quotes', () => {
  const html = built('free/index.html');
  assert.match(html, /actually/i);
  assert.match(html, /Bait/);
  assert.match(html, /Run it/);
  assert.match(html, /href="\/tools\/aider\//);
  assert.doesNotMatch(html, /MCP spec deprecation/);
  mastDoors(html);
});

test('signals lists dated sunsets from the catalogue, not invented ones', () => {
  const html = built('signals/index.html');
  assert.match(html, /What is/);
  assert.match(html, /ending/);
  assert.match(html, /90 days/);
  assert.match(html, /Signals/);
  assert.match(html, /Assistants API|Mistral Large|Suno free-tier|Yi API|Sora API/);
  assert.doesNotMatch(html, /MCP spec deprecation/);
  mastDoors(html);
});

test('signals shows the world-status snapshot', () => {
  const html = built('signals/index.html');
  assert.match(html, /Right now/);
  assert.match(html, /OpenAI|Cloudflare|Anthropic/);
  assert.match(html, /Signals/);
});

test('method door is a cover document', () => {
  const html = built('method/index.html');
  assert.match(html, /cover-night/);
  assert.match(html, /Method/);
  assert.match(html, /pull request is the unit of truth/);
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
