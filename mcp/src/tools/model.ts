import { nearSlugs, siteUrl } from '../data.ts';
import type { CatalogIndex, ModelCard } from '../data.ts';
import {
  formatContextWindow,
  formatModelPrice,
  hasPlaceholderZeroPrice,
  isPerMtokPriced,
} from '../model-format.ts';

export interface ModelResult extends ModelCard {
  url: string;
}

export interface ModelLookupError {
  error: string;
  suggestions: string[];
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

/** How many near-slug suggestions to offer on an unknown slug. */
const SUGGESTION_CAP = 5;

// Exported so `tool.ts` can hand back exactly this shape for a slug that
// names a model card — the "same content the `model` tool returns for that
// slug" the residual-fix ruling asks for, not a second, drifting builder of it.
export function withUrl(model: ModelCard): ModelResult {
  return { ...model, url: siteUrl('model', model.slug) };
}

export function modelLookup(index: CatalogIndex, args: ModelLookupArgs): ModelResult[] | ModelLookupError {
  if (args.slug) {
    const model = index.modelBySlug.get(args.slug);
    // An unknown slug is a mistake to name, not an empty catalog: answering
    // "No model matches those filters" for a call that carried no filters
    // reads as "Noemium has nothing like this", which is a different and
    // false claim. Same contract as `tool` — an explicit error plus near-slug
    // suggestions.
    if (!model) {
      return {
        error: `Unknown model slug "${args.slug}". Use search, or model filters, to find the card.`,
        suggestions: nearSlugs(index.modelBySlug.keys(), args.slug, SUGGESTION_CAP),
      };
    }
    return [withUrl(model)];
  }

  // Ordering must not be built on a field full of sentinels. Ten of the
  // catalog's models are priced per image / video-second / audio-second /
  // character and carry `0` in price_input_per_mtok as a schema placeholder,
  // so sorting by that field with no price filter in play floats all ten to
  // the top and answers "the cheapest models" with the ones whose token price
  // is not merely unknown but nonexistent. A token-price sort is honest only
  // when a token-price filter has already narrowed the set to cards that are
  // actually priced per token; otherwise order by popularity, then name.
  const byTokenPrice = args.max_input_per_mtok !== undefined;
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
    .sort((a, b) =>
      byTokenPrice
        ? a.price_input_per_mtok - b.price_input_per_mtok || a.slug.localeCompare(b.slug)
        : (b.popularity ?? 0) - (a.popularity ?? 0) || a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug),
    )
    .slice(0, args.limit ?? DEFAULT_LIMIT)
    .map(withUrl);
}

export function modelText(models: ModelResult[]): string {
  if (models.length === 0) return 'No model matches those filters in the Noemium map.';
  return models
    .map((model) => {
      const openNote = model.open_weights ? ', open weights' : '';
      return (
        `${model.name} (${model.provider}) — ${formatModelPrice(model)}, ` +
        `${formatContextWindow(model.context_window)}${openNote} ` +
        `(verified ${model.last_verified}) · ${model.url}`
      );
    })
    .join('\n');
}
