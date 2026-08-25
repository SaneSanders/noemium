import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { formatCostScenario } from '../src/lib/agent-display.ts';

const root = new URL('../', import.meta.url);

function built(path) {
  const file = new URL(`dist/${path}`, root);
  assert.equal(existsSync(file), true, `missing built page: dist/${path}`);
  return readFileSync(file, 'utf8');
}

test('formats fixed, ranged, and open-ended monthly agent costs', () => {
  assert.equal(
    formatCostScenario({ monthly_usd_min: 20, monthly_usd_max: 20 }),
    '$20/mo',
  );
  assert.equal(
    formatCostScenario({ monthly_usd_min: 5, monthly_usd_max: 50 }),
    '$5–$50/mo',
  );
  assert.equal(formatCostScenario({ monthly_usd_min: 9 }), '$9+/mo');
});

test('builds an agent index that keeps Grok Bot and Grok Build separate', () => {
  const html = built('agents/index.html');
  assert.match(html, /href="\/agents\/grok-bot\/"/);
  assert.match(html, /href="\/agents\/grok-build\/"/);
  assert.match(html, /Source verified/i);
  assert.match(html, /Radar/i);
});

test('builds the Grok Bot field guide with every current qualifying plan', () => {
  const html = built('agents/grok-bot/index.html');
  assert.match(html, /Cursor Ultra/);
  assert.match(html, /\$200\/mo/);
  assert.match(html, /SuperGrok Heavy/);
  assert.match(html, /\$300\/mo/);
  assert.match(html, /Cursor Premium Teams/);
  assert.match(html, /\$120\/mo/);
  assert.match(html, /Security boundary/i);
});

test('builds the OpenClaw guide with executable install and security context', () => {
  const html = built('agents/openclaw/index.html');
  assert.match(html, /curl -fsSL https:\/\/openclaw\.ai\/install\.sh \| bash/);
  assert.match(html, /Node\.js 22\.22\.3\+/);
  assert.match(html, /Security boundary/i);
  assert.match(html, /Threat model/i);
});

test('publishes agents through search and machine-readable discovery surfaces', () => {
  const index = JSON.parse(built('search-index.json'));
  assert.equal(index.agents.some((agent) => agent.slug === 'grok-bot'), true);
  assert.equal(index.agents.some((agent) => agent.slug === 'openclaw'), true);
});

test('links the Agent Field Guide from reference and emits agent OG art', () => {
  const reference = built('reference/index.html');
  assert.match(reference, /href="\/agents\/"/);
  assert.match(reference, /Field guide/i);
  assert.equal(existsSync(new URL('dist/og/agents/grok-bot.png', root)), true);
});
