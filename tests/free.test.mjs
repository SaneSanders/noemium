import test from 'node:test';
import assert from 'node:assert/strict';
import { baitEvidence, classifyFree, collectFree } from '../src/lib/free.ts';

const base = {
  slug: 'x',
  name: 'X',
  pricing: 'freemium',
  free_tier: true,
  open_source: false,
  self_host: false,
  verdict: 'situational',
};

test('run-it is free + open source + self-host', () => {
  const call = classifyFree({
    ...base,
    slug: 'aider',
    name: 'Aider',
    pricing: 'free',
    open_source: true,
    self_host: true,
    verdict: 'ship',
    price_note: 'free, open source; bring your own API key',
  });
  assert.equal(call.kind, 'run-it');
});

test('hosted-free is pricing free without a box to run', () => {
  const call = classifyFree({
    ...base,
    pricing: 'free',
    open_source: false,
    self_host: false,
    price_note: 'web/app chat is free',
  });
  assert.equal(call.kind, 'hosted-free');
});

test('bait needs a quote already on the card', () => {
  const tool = {
    ...base,
    slug: 'make',
    name: 'Make',
    limitations: ['Credits expire at the end of each month — unused quota does not roll over.'],
  };
  assert.match(baitEvidence(tool), /expire/i);
  assert.equal(classifyFree(tool).kind, 'bait');
});

test('ChatGPT Free in a price_note is not a trial bait', () => {
  const call = classifyFree({
    ...base,
    slug: 'openai-codex',
    name: 'OpenAI Codex',
    price_note: 'included in ChatGPT Free/Go/Plus/Pro; Plus $20/mo',
  });
  assert.equal(call.kind, 'usable-tier');
});

test('paid with no free tier is paid', () => {
  assert.equal(
    classifyFree({
      ...base,
      pricing: 'paid',
      free_tier: false,
    }).kind,
    'paid',
  );
});

test('collectFree does not invent tools or kinds', () => {
  const buckets = collectFree([
    {
      ...base,
      slug: 'aider',
      name: 'Aider',
      pricing: 'free',
      open_source: true,
      self_host: true,
      verdict: 'ship',
    },
    {
      ...base,
      slug: 'make',
      name: 'Make',
      limitations: ['Credits expire at the end of each month.'],
    },
  ]);
  assert.equal(buckets['run-it'].length, 1);
  assert.equal(buckets.bait.length, 1);
  assert.equal(buckets.paid.length, 0);
});
