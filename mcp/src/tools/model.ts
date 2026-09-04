import { siteUrl } from '../data.ts';
import type { CatalogIndex, ModelCard } from '../data.ts';

export interface ModelResult extends ModelCard {
  url: string;
}

export interface ModelLookupArgs {
  slug?: string;
  provider?: string;
  open_weights?: boolean;
  max_input_per_mtok?: number;
  min_context?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 10;

// The only `price_unit` value that means "this number is dollars per million
// tokens." Every other unit (image / video_second / audio_second / character)
// carries a `0`/`0` sentinel in price_input_per_mtok/price_output_per_mtok —
// see content-schemas.ts's modelSchema comment. A per-Mtok numeric filter
// must exclude those cards rather than let the sentinel zero pass as "free".
const PER_MTOK_UNIT = 'mtok';

function isPerMtokPriced(model: ModelCard): boolean {
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
function hasPlaceholderZeroPrice(model: ModelCard): boolean {
  return model.price_input_per_mtok === 0 && Boolean(model.price_amount);
}

// Human labels for the non-token price units a media model can carry.
const UNIT_LABELS: Record<string, string> = {
  mtok: 'Mtok',
  image: 'image',
  video_second: 'video-second',
  audio_second: 'audio-second',
  character: 'character',
};

function withUrl(model: ModelCard): ModelResult {
  return { ...model, url: siteUrl('model', model.slug) };
}

export function modelLookup(index: CatalogIndex, args: ModelLookupArgs): ModelResult[] {
  if (args.slug) {
    const model = index.modelBySlug.get(args.slug);
    return model ? [withUrl(model)] : [];
  }
  return index.snapshot.models
    .filter((model) => {
      if (args.provider && model.provider.toLowerCase() !== args.provider.toLowerCase()) return false;
      if (args.open_weights !== undefined && model.open_weights !== args.open_weights) return false;
      if (args.max_input_per_mtok !== undefined) {
        if (!isPerMtokPriced(model) || hasPlaceholderZeroPrice(model)) return false;
        if (model.price_input_per_mtok > args.max_input_per_mtok) return false;
      }
      if (args.min_context !== undefined && (model.context_window ?? 0) < args.min_context) return false;
      return true;
    })
    .sort((a, b) => a.price_input_per_mtok - b.price_input_per_mtok || a.slug.localeCompare(b.slug))
    .slice(0, args.limit ?? DEFAULT_LIMIT)
    .map(withUrl);
}

/**
 * `price_input_per_mtok`/`price_output_per_mtok` are `0`/`0` as a schema
 * sentinel for unit-priced media models (per-image, per-video-second, ...) —
 * the real number lives in `price_amount` + `price_unit`. Printing "$0/$0
 * per Mtok" for those would read as a free model when it is not, so a
 * metered-zero card renders its `price_amount` instead; only a genuine
 * token price (including a real, non-sentinel $0) prints the Mtok form.
 */
function formatPrice(model: ModelCard): string {
  const meteredZero = model.price_input_per_mtok === 0 && model.price_output_per_mtok === 0;
  if (meteredZero && model.price_amount !== undefined) {
    const unit = UNIT_LABELS[model.price_unit] ?? model.price_unit;
    return `$${model.price_amount} per ${unit}`;
  }
  return `$${model.price_input_per_mtok}/$${model.price_output_per_mtok} per Mtok`;
}

// `context_window` is optional and genuinely absent for media models
// (image/video/audio) — never print "undefined ctx" for those.
function formatContext(model: ModelCard): string {
  return model.context_window ? `${model.context_window} ctx` : 'context window n/a';
}

export function modelText(models: ModelResult[]): string {
  if (models.length === 0) return 'No model matches those filters in the Noemium map.';
  return models
    .map((model) => {
      const openNote = model.open_weights ? ', open weights' : '';
      return (
        `${model.name} (${model.provider}) — ${formatPrice(model)}, ${formatContext(model)}${openNote} ` +
        `(verified ${model.last_verified}) · ${model.url}`
      );
    })
    .join('\n');
}
