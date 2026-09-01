import test from 'node:test';
import assert from 'node:assert/strict';
import {
  apiLineUsd,
  apiSubtotal,
  calcTotal,
  decodeCalcState,
  encodeCalcState,
  formatUsd,
  seatKey,
  seatSubtotal,
} from '../src/lib/seats.ts';

const opus = {
  slug: 'claude-opus-5',
  name: 'Claude Opus 5',
  price_input_per_mtok: 5,
  price_output_per_mtok: 25,
  price_unit: 'mtok',
};

const sonnet = {
  slug: 'claude-sonnet-5',
  name: 'Claude Sonnet 5',
  price_input_per_mtok: 1.5,
  price_output_per_mtok: 7.5,
  price_unit: 'mtok',
};

const max20 = {
  tool: 'claude-code',
  plan: 'Max 20x',
  usd_month: 200,
  model: 'claude-opus-5',
  group: 'Claude',
  receipt: 'https://support.claude.com/en/articles/11049741-what-is-the-max-plan',
  tool_name: 'Claude Code',
  model_name: 'Claude Opus 5',
  quote: 'Max 20x $200/mo',
  input_mtok: 40,
  mid_mtok: 200 / 15,
  output_mtok: 8,
};

const pro = {
  tool: 'claude-code',
  plan: 'Pro',
  usd_month: 20,
  model: 'claude-sonnet-5',
  group: 'Claude',
  receipt: 'https://support.claude.com/en/articles/11049762-choose-a-claude-plan',
  tool_name: 'Claude Code',
  model_name: 'Claude Sonnet 5',
  quote: 'Pro $20/mo',
  input_mtok: 13.33,
  mid_mtok: 4.44,
  output_mtok: 2.67,
};

test('seatKey is stable and deterministic', () => {
  assert.equal(seatKey(max20), 'claude-code::Max 20x');
  assert.equal(seatKey(pro), 'claude-code::Pro');
});

test('seatSubtotal is zero with no seats selected', () => {
  assert.equal(seatSubtotal([max20, pro], {}), 0);
  assert.equal(seatSubtotal([max20, pro], { 'claude-code::Pro': 0 }), 0);
});

test('seatSubtotal multiplies declared dollars by count', () => {
  assert.equal(seatSubtotal([max20], { 'claude-code::Max 20x': 1 }), 200);
  assert.equal(seatSubtotal([max20], { 'claude-code::Max 20x': 3 }), 600);
  assert.equal(seatSubtotal([max20, pro], { 'claude-code::Max 20x': 1, 'claude-code::Pro': 2 }), 240);
});

test('seatSubtotal clamps counts to the 0-25 stepper range', () => {
  assert.equal(seatSubtotal([max20], { 'claude-code::Max 20x': -2 }), 0);
  assert.equal(seatSubtotal([max20], { 'claude-code::Max 20x': 26 }), 5000);
  assert.equal(seatSubtotal([max20], { 'claude-code::Max 20x': 2.7 }), 600);
});

test('apiLineUsd is list-rate arithmetic, not usage', () => {
  assert.equal(apiLineUsd(opus, 10, 5), 10 * 5 + 5 * 25);
  assert.equal(apiLineUsd(opus, 0, 0), 0);
  assert.equal(apiLineUsd(opus, 1, 0), 5);
  assert.equal(apiLineUsd(opus, 0, 1), 25);
  assert.equal(apiLineUsd(undefined, 10, 5), 0);
});

test('apiLineUsd drops unpriced or unit-priced models', () => {
  const imageModel = { ...opus, slug: 'flux-2-pro', price_unit: 'image' };
  assert.equal(apiLineUsd(imageModel, 10, 5), 0);
  const zeroModel = { ...opus, price_input_per_mtok: 0 };
  assert.equal(apiLineUsd(zeroModel, 10, 5), 0);
  const negativeInput = { ...opus, price_input_per_mtok: -1 };
  assert.equal(apiLineUsd(negativeInput, 10, 5), 0);
});

test('apiSubtotal sums only allowed priced models', () => {
  const models = new Map([
    [opus.slug, opus],
    [sonnet.slug, sonnet],
  ]);
  const lines = [
    { model: 'claude-opus-5', inputMtok: 10, outputMtok: 5 },
    { model: 'claude-sonnet-5', inputMtok: 20, outputMtok: 10 },
    { model: 'missing-model', inputMtok: 1, outputMtok: 1 },
  ];
  const expected = apiLineUsd(opus, 10, 5) + apiLineUsd(sonnet, 20, 10);
  assert.equal(apiSubtotal(lines, models), expected);
});

test('calcTotal is seats plus API, nothing else', () => {
  const models = new Map([[opus.slug, opus]]);
  const counts = { 'claude-code::Max 20x': 2 };
  const lines = [{ model: 'claude-opus-5', inputMtok: 10, outputMtok: 5 }];
  assert.equal(calcTotal([max20], counts, lines, models), 400 + apiLineUsd(opus, 10, 5));
});

test('formatUsd never invents precision or negative dollars', () => {
  assert.equal(formatUsd(0), '$0');
  assert.equal(formatUsd(-10), '$0');
  assert.equal(formatUsd(20), '$20');
  assert.equal(formatUsd(19.99), '$19.99');
  assert.equal(formatUsd(200.5), '$200.50');
});

test('encodeCalcState only writes non-zero selections', () => {
  assert.equal(encodeCalcState({}, []), '');
  assert.equal(encodeCalcState({ 'claude-code::Pro': 0 }, []), '');
  assert.match(encodeCalcState({ 'claude-code::Pro': 2 }, []), /^seats=/);
  assert.match(encodeCalcState({}, [{ model: 'claude-opus-5', inputMtok: 0, outputMtok: 0 }]), /^$/);
});

test('decodeCalcState round-trips seat counts and API lines', () => {
  const counts = { 'claude-code::Max 20x': 2, 'claude-code::Pro': 1 };
  const lines = [
    { model: 'claude-opus-5', inputMtok: 10, outputMtok: 5 },
    { model: 'claude-sonnet-5', inputMtok: 2.5, outputMtok: 1 },
  ];
  const qs = encodeCalcState(counts, lines);
  const decoded = decodeCalcState(qs, [max20, pro], [opus, sonnet]);
  assert.deepEqual(decoded.counts, counts);
  assert.deepEqual(decoded.lines, lines);
});

test('decodeCalcState drops invalid seats and models', () => {
  const qs = encodeCalcState(
    { 'claude-code::Max 20x': 1, 'fake-tool::Fake': 1 },
    [
      { model: 'claude-opus-5', inputMtok: 1, outputMtok: 1 },
      { model: 'fake-model', inputMtok: 1, outputMtok: 1 },
    ],
  );
  const decoded = decodeCalcState(qs, [max20], [opus]);
  assert.deepEqual(decoded.counts, { 'claude-code::Max 20x': 1 });
  assert.deepEqual(decoded.lines, [{ model: 'claude-opus-5', inputMtok: 1, outputMtok: 1 }]);
});

test('decodeCalcState ignores malformed tokens and negative volumes', () => {
  const qs = 'seats=claude-code::Max%2020x:2&api=claude-opus-5:-1:5,claude-opus-5:1';
  const decoded = decodeCalcState(qs, [max20], [opus]);
  assert.deepEqual(decoded.counts, { 'claude-code::Max 20x': 2 });
  assert.deepEqual(decoded.lines, []);
});
