import type { ModelCard } from './data.ts';

// The ONE place a model price is turned into text. `search`, `model` and
// `check` all render model cards, and they must never diverge: an earlier
// version of `search.ts` built its own `$in/$out per Mtok` string and so kept
// printing "$0/$0 per Mtok" for audio/video/image models long after
// `model.ts` had learned that those zeros are a schema sentinel, not a price.

// The only `price_unit` value that means "this number is dollars per million
// tokens." Every other unit (image / video_second / audio_second / character)
// carries a `0`/`0` sentinel in price_input_per_mtok/price_output_per_mtok —
// see content-schemas.ts's modelSchema comment. A per-Mtok numeric filter
// must exclude those cards rather than let the sentinel zero pass as "free".
export const PER_MTOK_UNIT = 'mtok';

// Human labels for the non-token price units a media model can carry.
const UNIT_LABELS: Record<string, string> = {
  mtok: 'Mtok',
  image: 'image',
  video_second: 'video-second',
  audio_second: 'audio-second',
  character: 'character',
};

export function isPerMtokPriced(model: ModelCard): boolean {
  // `price_unit` defaults to 'mtok' via zod in the real snapshot pipeline
  // and is only ever something else for genuinely unit-priced media models —
  // never absent there. A falsy value here (e.g. a hand-built test fixture
  // that omits the field, since `buildIndex` does not run zod defaults) is
  // treated the same as that default rather than excluded.
  return !model.price_unit || model.price_unit === PER_MTOK_UNIT;
}

// A zero `price_input_per_mtok` is only trustworthy when nothing contradicts
// it. Some catalog cards declare `price_unit: 'mtok'` but record their real
// price in `price_amount` (a different unit or currency, or just a data-entry
// quirk) while leaving the per-Mtok fields at the schema's `0` default — see
// seedance-2-5, whose `price_amount: 70` (CNY per million tokens) contradicts
// the `0`/`0` sitting in price_input_per_mtok/price_output_per_mtok. That zero
// is a placeholder, not a price: do NOT let it read as "free" here. A
// genuinely free model (zero token price, no contradicting `price_amount`)
// must still pass — do not "simplify" this into a plain zero check.
export function hasPlaceholderZeroPrice(model: ModelCard): boolean {
  return model.price_input_per_mtok === 0 && Boolean(model.price_amount);
}

// `price_currency` defaults to 'usd' via zod in the real snapshot pipeline —
// same fixture caveat as `isPerMtokPriced` above, a hand-built test object
// that omits the field is treated as USD rather than excluded. A per-Mtok
// numeric filter compares dollars, so a card whose real price lives in
// another currency (seedance-2-5's 70 CNY) must never pass that comparison,
// even one whose per-Mtok fields already read 0 for an unrelated reason.
export function isUsdPriced(model: ModelCard): boolean {
  return !model.price_currency || model.price_currency === 'usd';
}

// A non-USD amount is printed with its currency code, never a dollar sign —
// see content-schemas.ts's modelSchema `price_currency` comment: it is never
// converted, so there is no dollar figure to print for it.
function formatAmount(amount: number, currency: string): string {
  return currency === 'usd' || !currency ? `$${amount}` : `${amount} ${currency.toUpperCase()}`;
}

/**
 * `price_input_per_mtok`/`price_output_per_mtok` are `0`/`0` as a schema
 * sentinel for unit-priced media models (per-image, per-video-second, ...) —
 * the real number lives in `price_amount` + `price_unit`. Printing "$0/$0
 * per Mtok" for those would read as a free model when it is not, so a
 * metered-zero card renders its `price_amount` instead; only a genuine
 * token price (including a real, non-sentinel $0) prints the Mtok form.
 */
export function formatModelPrice(model: ModelCard): string {
  const currency = model.price_currency || 'usd';
  const meteredZero = model.price_input_per_mtok === 0 && model.price_output_per_mtok === 0;
  if (meteredZero && model.price_amount !== undefined) {
    const unit = UNIT_LABELS[model.price_unit] ?? model.price_unit;
    return `${formatAmount(model.price_amount, currency)} per ${unit}`;
  }
  return `${formatAmount(model.price_input_per_mtok, currency)}/${formatAmount(model.price_output_per_mtok, currency)} per Mtok`;
}

// `context_window` is optional and genuinely absent for media models
// (image/video/audio) — never print "undefined ctx" or a bare "?" for those.
export function formatContextWindow(contextWindow: number | undefined): string {
  return contextWindow ? `${contextWindow} ctx` : 'context window n/a';
}

export function formatModelContext(model: ModelCard): string {
  return formatContextWindow(model.context_window);
}
