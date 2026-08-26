import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatChangeValue, serializeChangeValue } from '../src/lib/changelog-value.ts';

const retiring = { date: '2026-08-31', successor: 'mistral-medium-3-5' };

test('formatChangeValue: retiring object is date → successor, not [object Object]', () => {
  assert.equal(String(retiring), '[object Object]');
  assert.equal(formatChangeValue(retiring), '2026-08-31 → mistral-medium-3-5');
});

test('formatChangeValue: primitives and null stay readable', () => {
  assert.equal(formatChangeValue(null), '—');
  assert.equal(formatChangeValue(undefined), '—');
  assert.equal(formatChangeValue(4), '4');
  assert.equal(formatChangeValue(false), 'false');
  assert.equal(formatChangeValue('hello'), 'hello');
});

test('serializeChangeValue keeps primitives, stringifies objects', () => {
  assert.equal(serializeChangeValue(null), null);
  assert.equal(serializeChangeValue(0.5), 0.5);
  assert.equal(serializeChangeValue(true), true);
  assert.equal(serializeChangeValue(retiring), '2026-08-31 → mistral-medium-3-5');
});

test('changelog.json from/to never render as [object Object]', () => {
  const changelog = JSON.parse(
    readFileSync(new URL('../src/data/changelog.json', import.meta.url), 'utf8'),
  );
  let mistralRetiring = null;
  for (const week of changelog.weeks) {
    for (const c of week.changed ?? []) {
      assert.doesNotMatch(
        formatChangeValue(c.from),
        /\[object Object\]/,
        `${c.name} ${c.field} from`,
      );
      assert.doesNotMatch(
        formatChangeValue(c.to),
        /\[object Object\]/,
        `${c.name} ${c.field} to`,
      );
      if (c.slug === 'mistral-large-2512' && c.field === 'retiring') mistralRetiring = c;
    }
  }
  assert.ok(mistralRetiring, 'Mistral Large 3 retiring change should exist');
  assert.equal(formatChangeValue(mistralRetiring.to), '2026-08-31 → mistral-medium-3-5');
});
