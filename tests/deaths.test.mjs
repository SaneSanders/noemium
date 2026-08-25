import test from 'node:test';
import assert from 'node:assert/strict';
import { collectDeaths, HORIZON_DAYS } from '../src/lib/deaths.ts';

const asOf = '2026-08-25';

test('collects model retiring dates inside the 90-day window', () => {
  const { upcoming } = collectDeaths({
    asOf,
    models: [
      { slug: 'mistral-large-2512', name: 'Mistral Large 3', retiring: { date: '2026-08-31', successor: 'mistral-medium-3-5' } },
      { slug: 'mistral-medium-3-5', name: 'Mistral Medium 3.5' },
    ],
    tools: [],
    graveyard: [],
  });
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].slug, 'mistral-large-2512');
  assert.equal(upcoming[0].kind, 'model');
  assert.ok(upcoming[0].days >= 0 && upcoming[0].days <= HORIZON_DAYS);
  assert.match(upcoming[0].quote, /Mistral Medium 3.5/);
});

test('renames Responses sunset to Assistants API', () => {
  const { upcoming } = collectDeaths({
    asOf,
    models: [],
    tools: [
      {
        slug: 'openai-responses',
        name: 'Responses API',
        limitations: ['Assistants API sunsets 2026-08-26 — Responses is the default for new projects.'],
      },
    ],
    graveyard: [],
  });
  assert.equal(upcoming[0].name, 'OpenAI Assistants API');
  assert.equal(upcoming[0].kind, 'api');
  assert.equal(upcoming[0].migrate?.name, 'Responses API');
});

test('ignores ISO dates without a sunset verb', () => {
  const { upcoming, past } = collectDeaths({
    asOf,
    models: [],
    tools: [
      {
        slug: 'qwen',
        name: 'Qwen',
        verdict_text: 'GA 2026-08-03; still the default open-weights flagship.',
      },
    ],
    graveyard: [],
  });
  assert.equal(upcoming.length, 0);
  assert.equal(past.length, 0);
});

test('graveyard deaths land in the past; future API dates stay upcoming', () => {
  const { upcoming, past } = collectDeaths({
    asOf,
    models: [],
    tools: [],
    graveyard: [
      {
        slug: 'sora',
        name: 'Sora',
        died: '2026-04-26',
        cause: 'OpenAI discontinued the Sora web app and API.',
        succeeded_by: {
          none: true,
          note: 'OpenAI announced no successor. The API itself dies 2026-09-24.',
        },
      },
    ],
  });
  assert.equal(past.some((e) => e.slug === 'sora' && e.kind === 'grave'), true);
  const api = upcoming.find((e) => e.slug === 'sora' && e.date === '2026-09-24');
  assert.equal(api?.name, 'Sora API (legacy)');
});

test('does not invent dates', () => {
  const { upcoming, past } = collectDeaths({
    asOf,
    models: [{ slug: 'alive', name: 'Alive' }],
    tools: [{ slug: 'cursor', name: 'Cursor', limitations: ['Pro plan token limits throttle heavy agent sessions.'] }],
    graveyard: [],
  });
  assert.equal(upcoming.length, 0);
  assert.equal(past.length, 0);
});
