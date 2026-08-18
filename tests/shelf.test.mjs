import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alternativeIds,
  isBuilderKit,
  isHomepageReceipt,
  plural,
  relatedIds,
} from '../src/lib/shelf.ts';

test('hides Lucide and footer galleries as builder kit', () => {
  assert.equal(isBuilderKit({ slug: 'lucide', category: 'design', tagline: 'icons' }), true);
  assert.equal(isBuilderKit({ slug: 'footer', category: 'design', tagline: 'gallery' }), true);
  assert.equal(isBuilderKit({ slug: 'v0', category: 'design', tagline: 'AI design-to-code' }), false);
  assert.equal(isBuilderKit({ slug: 'cursor', category: 'coding' }), false);
});

test('ChatGPT alternatives are assistants, not Jasper', () => {
  const tools = [
    { id: 'chatgpt', name: 'ChatGPT', category: 'writing', verdict: 'ship', last_verified: '2026-08-15' },
    { id: 'claude', name: 'Claude', category: 'writing', verdict: 'ship', last_verified: '2026-08-15' },
    { id: 'jasper', name: 'Jasper', category: 'writing', verdict: 'skip', last_verified: '2026-08-15' },
    { id: 'perplexity', name: 'Perplexity', category: 'data', verdict: 'ship', last_verified: '2026-08-15' },
    { id: 'gemini', name: 'Gemini', category: 'writing', verdict: 'ship', last_verified: '2026-08-15' },
    { id: 'grammarly', name: 'Grammarly', category: 'writing', verdict: 'situational', last_verified: '2026-08-15' },
  ];
  const alts = alternativeIds('chatgpt', tools);
  assert.ok(alts.includes('claude'));
  assert.ok(alts.includes('perplexity'));
  assert.ok(alts.includes('gemini'));
  assert.equal(alts.includes('jasper'), false);
  assert.equal(alts.includes('grammarly'), false);
});

test('related picks coding peers for Cursor', () => {
  const tools = [
    { id: 'cursor', name: 'Cursor', category: 'coding', verdict: 'ship', last_verified: '2026-08-15' },
    { id: 'claude-code', name: 'Claude Code', category: 'coding', verdict: 'ship', last_verified: '2026-08-15' },
    { id: 'github-copilot', name: 'Copilot', category: 'coding', verdict: 'situational', last_verified: '2026-08-15' },
  ];
  assert.deepEqual(relatedIds('cursor', tools), ['claude-code', 'github-copilot']);
});

test('pluralizes tool counts', () => {
  assert.equal(plural(1, 'tool'), '1 tool');
  assert.equal(plural(2, 'tool'), '2 tools');
});

test('marks homepage URLs as weak receipts', () => {
  assert.equal(isHomepageReceipt('https://chatgpt.com/'), true);
  assert.equal(isHomepageReceipt('https://www.jasper.ai/pricing'), false);
});
