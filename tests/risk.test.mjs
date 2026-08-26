import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeekRisk, classifyRiskField, formatRiskDescription, formatRiskTitle } from '../src/lib/risk.ts';

const baseWeek = {
  id: '2026-W34',
  from: '2026-08-17',
  to: '2026-08-24',
  counts: { added: 0, removed: 0, changed: 0 },
  added: [],
  removed: [],
  changed: [],
};

test('classifies price and verdict fields, ignores tagline edits', () => {
  assert.equal(classifyRiskField('tools', 'pricing'), 'price_change');
  assert.equal(classifyRiskField('tools', 'price note'), 'price_change');
  assert.equal(classifyRiskField('tools', 'free tier'), 'price_change');
  assert.equal(classifyRiskField('tools', 'verdict'), 'verdict_change');
  assert.equal(classifyRiskField('tools', 'tagline'), null);
  assert.equal(classifyRiskField('models', 'input $/Mtok'), 'price_change');
  assert.equal(classifyRiskField('models', 'retiring'), 'retirement');
  assert.equal(classifyRiskField('agents', 'verdict'), null);
});

test('buildWeekRisk picks price and verdict changes, ignores tagline edits', () => {
  const week = {
    ...baseWeek,
    changed: [
      {
        name: 'Cursor',
        slug: 'cursor',
        collection: 'tools',
        field: 'price note',
        from: 'from $20/mo',
        to: 'Hobby free; Pro from $20/mo',
      },
      {
        name: 'Yi API',
        slug: 'yi-api',
        collection: 'tools',
        field: 'verdict',
        from: 'situational',
        to: 'skip',
      },
      {
        name: 'Claude',
        slug: 'claude',
        collection: 'tools',
        field: 'tagline',
        from: 'old',
        to: 'new',
      },
    ],
  };
  const risk = buildWeekRisk(week);
  assert.equal(risk.length, 2);
  assert.equal(risk[0].class, 'price_change');
  assert.equal(risk[0].slug, 'cursor');
  assert.equal(risk[1].class, 'verdict_change');
  assert.equal(risk[1].slug, 'yi-api');
});

test('buildWeekRisk retiring change uses retiring meta when to is a string', () => {
  const week = {
    ...baseWeek,
    changed: [
      {
        name: 'Mistral Large 3',
        slug: 'mistral-large-2512',
        collection: 'models',
        field: 'retiring',
        from: null,
        to: '2026-08-31 → mistral-medium-3-5',
        retiring: { date: '2026-08-31', successor: 'mistral-medium-3-5' },
      },
    ],
  };
  const risk = buildWeekRisk(week);
  assert.equal(risk.length, 1);
  assert.equal(risk[0].class, 'retirement');
  assert.equal(risk[0].detail, 'retiring 2026-08-31 → mistral-medium-3-5');
});

test('buildWeekRisk detects graveyard deaths and model retirements', () => {
  const week = {
    ...baseWeek,
    added: [
      {
        name: 'Dead Tool',
        slug: 'dead-tool',
        collection: 'graveyard',
      },
      {
        name: 'Mistral Large 3',
        slug: 'mistral-large-2512',
        collection: 'models',
        retiring: { date: '2026-08-31', successor: 'mistral-medium-3-5' },
      },
    ],
  };
  const risk = buildWeekRisk(week);
  assert.equal(risk.length, 2);
  assert.equal(risk[0].class, 'death');
  assert.equal(risk[0].slug, 'dead-tool');
  assert.equal(risk[1].class, 'retirement');
  assert.equal(risk[1].detail, 'retiring 2026-08-31 → mistral-medium-3-5');
});

test('formatRiskTitle skips zero classes and pluralizes correctly', () => {
  const week = {
    ...baseWeek,
    risk: [
      { class: 'price_change', collection: 'tools', slug: 'a', name: 'A', detail: '' },
      { class: 'price_change', collection: 'tools', slug: 'b', name: 'B', detail: '' },
      { class: 'verdict_change', collection: 'tools', slug: 'c', name: 'C', detail: '' },
    ],
  };
  assert.equal(formatRiskTitle(week), 'Week 2026-W34: 2 price moves, 1 verdict change');
});

test('formatRiskDescription lists events with details', () => {
  const week = {
    ...baseWeek,
    risk: [
      {
        class: 'price_change',
        collection: 'tools',
        slug: 'cursor',
        name: 'Cursor',
        detail: 'price note: from $20/mo → Hobby free; Pro from $20/mo',
      },
      {
        class: 'death',
        collection: 'graveyard',
        slug: 'dead-tool',
        name: 'Dead Tool',
        detail: '',
      },
    ],
  };
  const desc = formatRiskDescription(week);
  assert.match(desc, /price move: Cursor/);
  assert.match(desc, /death: Dead Tool/);
});
