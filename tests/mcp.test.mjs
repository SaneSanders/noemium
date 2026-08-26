import test from 'node:test';
import assert from 'node:assert/strict';
import { RELATED_MCP, collectMcp } from '../src/lib/mcp.ts';

test('collectMcp shelves only category mcp', () => {
  const { shelf, related } = collectMcp([
    {
      slug: 'playwright-mcp',
      name: 'Playwright MCP',
      tagline: 'browser',
      verdict: 'ship',
      category: 'mcp',
    },
    {
      slug: 'cursor',
      name: 'Cursor',
      tagline: 'editor',
      verdict: 'ship',
      category: 'coding',
    },
    {
      slug: 'pharos',
      name: 'Pharos',
      tagline: 'registry',
      verdict: 'situational',
      category: 'dev-infra',
    },
  ]);
  assert.equal(shelf.length, 1);
  assert.equal(shelf[0].slug, 'playwright-mcp');
  assert.equal(related.length, 1);
  assert.equal(related[0].slug, 'pharos');
});

test('related cousins stay a named list, not a scrape', () => {
  assert.deepEqual([...RELATED_MCP], ['pharos', 'cogni', 'doberman', 'firecrawl', 'linear']);
});

test('collectMcp does not invent a skip that was not passed in', () => {
  const { shelf } = collectMcp([
    {
      slug: 'filesystem-mcp',
      name: 'Filesystem MCP',
      tagline: 'disk',
      verdict: 'situational',
      category: 'mcp',
    },
  ]);
  assert.equal(shelf.every((t) => t.verdict !== 'skip'), true);
});
