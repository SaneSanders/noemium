import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createHandler } from '../src/server.ts';
import { createWorker } from '../src/worker.ts';
import { fixture } from './fixtures.mjs';

const NULL_CTX = { waitUntil: () => {} };

function fetchWorker(rawSnapshot, path) {
  return createWorker(rawSnapshot).fetch(new Request(`http://test.local${path}`), {}, NULL_CTX);
}

async function connect() {
  const handler = createHandler(fixture);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
      fetch: (url, init) => handler.fetch(new Request(url, init)),
    }),
  );
  return client;
}

test('the server exposes exactly the five read-only tools', async () => {
  const client = await connect();
  const names = (await client.listTools()).tools.map((t) => t.name).sort();
  assert.deepEqual(names, ['check', 'model', 'search', 'stack', 'tool']);
  await client.close();
});

test('instructions tell the agent to call before recommending', async () => {
  const client = await connect();
  const instructions = client.getInstructions();
  assert.match(instructions, /before you recommend/i);
  assert.match(instructions, /do not invent/i);
  await client.close();
});

test('check over MCP reports the death of Flowise', async () => {
  const client = await connect();
  const res = await client.callTool({ name: 'check', arguments: { names: ['flowise', 'cursor'] } });
  assert.match(res.content[0].text, /flowise — DEAD 2026-08-31/);
  assert.equal(res.structuredContent.results[0].status, 'dead');
  assert.equal(res.structuredContent.results[1].status, 'ship');
  await client.close();
});

test('every returned card carries last_verified and a noemium url', async () => {
  const client = await connect();
  const res = await client.callTool({ name: 'search', arguments: { query: 'coding agent editor' } });
  for (const hit of res.structuredContent.results) {
    assert.ok(hit.last_verified, `${hit.slug} returned without last_verified`);
    assert.ok(hit.url.startsWith('https://noemium.com/'), `${hit.slug} url is not a noemium card`);
  }
  await client.close();
});

test('too many names is a validation error, not a truncated answer', async () => {
  // This SDK version (@modelcontextprotocol/server 2.0.0) resolves an
  // input-schema violation as a normal CallToolResult with `isError: true`
  // rather than rejecting the RPC — confirmed by probing the live call.
  // Either mechanism is acceptable per this task's controller ruling as long
  // as the answer is a refusal, never a silently truncated names list.
  const client = await connect();
  const res = await client.callTool({
    name: 'check',
    arguments: { names: Array.from({ length: 26 }, (_, i) => `t${i}`) },
  });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /invalid|validation|too_big/i);
  await client.close();
});

test('an unknown slug is an explicit error, never a fabricated card', async () => {
  const client = await connect();
  const res = await client.callTool({ name: 'tool', arguments: { slug: 'not-a-real-tool' } });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /unknown slug/i);
  await client.close();
});

test('instructions numbers come from the live snapshot, not a hardcoded literal', async () => {
  const client = await connect();
  const instructions = client.getInstructions();
  assert.match(instructions, new RegExp(`roughly ${fixture.tools.length} AI tools`));
  assert.match(instructions, new RegExp(`${fixture.models.length} models`));
  assert.match(instructions, new RegExp(`${fixture.stacks.length} stacks`));
  assert.match(instructions, new RegExp(`${fixture.graveyard.length} dead products`));
  await client.close();
});

test('a stack call with only max_monthly_usd lists stacks, not the "does not guess" refusal', async () => {
  const client = await connect();
  const res = await client.callTool({ name: 'stack', arguments: { max_monthly_usd: 50 } });
  assert.equal(res.isError, undefined);
  assert.ok(res.structuredContent.results.length > 0, 'a budget-only call must list matching stacks');
  assert.doesNotMatch(res.content[0].text, /does not guess/i);
  assert.ok(
    res.structuredContent.results.every(
      (s) => Math.min(s.monthly_cost_usd, s.budget?.monthly_cost_usd ?? Infinity) <= 50,
    ),
  );
  await client.close();
});

test('a stack call with no arguments at all lists every stack, not the "does not guess" refusal', async () => {
  const client = await connect();
  const res = await client.callTool({ name: 'stack', arguments: {} });
  assert.equal(res.isError, undefined);
  assert.equal(res.structuredContent.results.length, fixture.stacks.length);
  assert.doesNotMatch(res.content[0].text, /does not guess/i);
  await client.close();
});

test('/health derives its numbers from the real snapshot, not the declared counts', async () => {
  const response = await fetchWorker(fixture, '/health');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.entries, {
    tools: fixture.tools.length,
    models: fixture.models.length,
    stacks: fixture.stacks.length,
    graveyard: fixture.graveyard.length,
  });
});

test('/health reports ok: false with real zero counts for a malformed snapshot', async () => {
  const response = await fetchWorker({ bogus: true }, '/health');
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.deepEqual(body.entries, { tools: 0, models: 0, stacks: 0, graveyard: 0 });
  assert.ok(body.error, 'a broken snapshot must explain itself, not just say ok: false');
});

test('/health reports ok: false with real zero counts for a shaped-but-empty snapshot, ' +
  'even when the snapshot lies about its own counts', async () => {
  const shapedButEmpty = {
    built: '2026-01-01',
    // Deliberately wrong: the declared counts claim a full catalog while
    // every array is actually empty — this is the exact defect Finding 1
    // reproduced against the old `entries: data.counts` implementation.
    counts: { tools: 331, models: 45, stacks: 15, graveyard: 14 },
    tools: [],
    models: [],
    stacks: [],
    graveyard: [],
  };
  const response = await fetchWorker(shapedButEmpty, '/health');
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.deepEqual(body.entries, { tools: 0, models: 0, stacks: 0, graveyard: 0 });
  assert.ok(body.error, 'an empty catalog must not be reported as healthy');
});

test('the landing page prints the same derived numbers as /health', async () => {
  const response = await fetchWorker(fixture, '/');
  const text = await response.text();
  assert.match(text, new RegExp(`${fixture.tools.length} tools`));
  assert.match(text, new RegExp(`${fixture.models.length} models`));
  assert.match(text, new RegExp(`${fixture.stacks.length} stacks`));
  assert.match(text, new RegExp(`${fixture.graveyard.length} dead products`));
});
