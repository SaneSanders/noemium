import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEATS,
  blendedUsdPerMtok,
  collectSeats,
  dollarOnCard,
  formatMtok,
  mtokForUsd,
} from '../src/lib/seats.ts';

test('$20 on a card is not $200', () => {
  assert.equal(dollarOnCard('Plus $20/mo, Pro from $100/mo', 20), true);
  assert.equal(dollarOnCard('Plus $20/mo, Pro from $100/mo', 200), false);
  assert.equal(dollarOnCard('Max 20x $200 per month', 20), false);
  assert.equal(dollarOnCard('Max 20x $200 per month', 200), true);
  assert.equal(dollarOnCard('Pro $20.00/mo', 20), true);
  assert.equal(dollarOnCard('AI Pro $19.99/mo', 19.99), true);
  assert.equal(dollarOnCard('Ultra $199.99/mo', 19.99), false);
  assert.equal(dollarOnCard(undefined, 20), false);
});

test('mtokForUsd is seat dollars over list rate, nothing else', () => {
  assert.equal(mtokForUsd(200, 25), 8);
  assert.equal(mtokForUsd(200, 5), 40);
  assert.equal(mtokForUsd(20, 25), 0.8);
  assert.equal(mtokForUsd(200, 0), 0);
});

test('50/50 blend is arithmetic, not a usage claim', () => {
  assert.equal(blendedUsdPerMtok(5, 25, 0.5), 15);
  assert.equal(mtokForUsd(200, blendedUsdPerMtok(5, 25, 0.5)), 200 / 15);
  assert.equal(blendedUsdPerMtok(5, 25, 0), 5);
  assert.equal(blendedUsdPerMtok(5, 25, 1), 25);
});

test('formatMtok does not invent precision', () => {
  assert.equal(formatMtok(8), '8.0 MTok');
  assert.equal(formatMtok(40), '40 MTok');
  assert.equal(formatMtok(200 / 15), '13.3 MTok');
  assert.equal(formatMtok(0.8), '0.80 MTok');
  assert.equal(formatMtok(0), '—');
});

const opus = {
  slug: 'claude-opus-5',
  name: 'Claude Opus 5',
  price_input_per_mtok: 5,
  price_output_per_mtok: 25,
  price_unit: 'mtok',
};

const max20 = {
  tool: 'claude-code',
  plan: 'Max 20x',
  usd_month: 200,
  model: 'claude-opus-5',
  group: 'Claude',
  receipt: 'https://support.claude.com/en/articles/11049741-what-is-the-max-plan',
};

test('collectSeats drops a seat whose dollars are not on the card', () => {
  const rows = collectSeats({
    seats: [max20],
    tools: [{ slug: 'claude-code', name: 'Claude Code', price_note: 'included in paid plans' }],
    models: [opus],
  });
  assert.equal(rows.length, 0);
});

test('collectSeats drops a missing model instead of inventing a rate', () => {
  const rows = collectSeats({
    seats: [max20],
    tools: [{ slug: 'claude-code', name: 'Claude Code', price_note: 'Max 20x $200/mo' }],
    models: [],
  });
  assert.equal(rows.length, 0);
});

test('collectSeats prices Max 20x against Opus list, from the card', () => {
  const [row] = collectSeats({
    seats: [max20],
    tools: [
      {
        slug: 'claude-code',
        name: 'Claude Code',
        price_note: 'Pro $20/mo; Max 5x $100 / Max 20x $200',
      },
    ],
    models: [opus],
  });
  assert.equal(row.tool, 'claude-code');
  assert.equal(row.usd_month, 200);
  assert.equal(row.model_name, 'Claude Opus 5');
  assert.equal(row.input_mtok, 40);
  assert.equal(row.output_mtok, 8);
  assert.equal(row.mid_mtok, 200 / 15);
  assert.match(row.quote, /\$200/);
});

test('published seats are nine coding meters with https receipts', () => {
  assert.equal(SEATS.length, 9);
  assert.equal(new Set(SEATS.map((s) => s.group)).size, 3);
  for (const seat of SEATS) {
    assert.match(seat.receipt, /^https:\/\//);
    assert.ok(seat.usd_month > 0);
  }
});

test('collectSeats skips unit-priced media models', () => {
  const rows = collectSeats({
    seats: [{ ...max20, model: 'flux-2-pro' }],
    tools: [{ slug: 'claude-code', name: 'Claude Code', price_note: 'Max 20x $200/mo' }],
    models: [
      {
        slug: 'flux-2-pro',
        name: 'FLUX.2 Pro',
        price_input_per_mtok: 0,
        price_output_per_mtok: 0,
        price_unit: 'image',
      },
    ],
  });
  assert.equal(rows.length, 0);
});

// named regression: a non-USD card must never enter a seat-vs-API row, even
// one with a real non-zero per-Mtok split in its own currency (not just
// seedance-2-5's placeholder 0/0) — mixing 70 CNY into a dollar total would
// silently understate the real cost.
test('collectSeats excludes a non-USD model even with a real, non-zero per-Mtok split', () => {
  const rows = collectSeats({
    seats: [{ ...max20, model: 'yuan-model' }],
    tools: [{ slug: 'claude-code', name: 'Claude Code', price_note: 'Max 20x $200/mo' }],
    models: [
      {
        slug: 'yuan-model',
        name: 'Yuan Model',
        price_input_per_mtok: 5,
        price_output_per_mtok: 25,
        price_unit: 'mtok',
        price_currency: 'cny',
      },
    ],
  });
  assert.equal(rows.length, 0);
});

// counter-case: an ordinary USD model (opus fixture above, no price_currency
// at all) still produces a row exactly as before.
test('collectSeats still prices an ordinary USD model with no price_currency field', () => {
  const rows = collectSeats({
    seats: [max20],
    tools: [{ slug: 'claude-code', name: 'Claude Code', price_note: 'Max 20x $200/mo' }],
    models: [opus],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].model, 'claude-opus-5');
});
