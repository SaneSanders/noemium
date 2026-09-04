import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createHandler } from '../src/server.ts';
import { fixture } from './fixtures.mjs';

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
