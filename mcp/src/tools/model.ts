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
      if (args.max_input_per_mtok !== undefined && model.price_input_per_mtok > args.max_input_per_mtok) return false;
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
