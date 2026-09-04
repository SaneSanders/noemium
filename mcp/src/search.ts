import { siteUrl } from './data.ts';
import type { CatalogIndex, GraveCard, ModelCard, StackCard, ToolCard, Verdict } from './data.ts';

export const NO_RESULTS_NOTE = 'No card for this. Noemium does not guess.';

/** Quality floor: a card must clear this to be worth returning at all. Do not lower it to pass a test. */
const MIN_SCORE = 3;
const FRESH_DAYS = 60;
// 'model'/'models' join 'tool'/'app' here for the same reason: in an AI catalog
// almost every tool's copy mentions "models" generically (API access, routing,
// etc.), so the word carries no discriminating signal and would let an
// unrelated tool that happens to say "models" outrank an actual ModelCard
// whose own name is never literally "a model" (e.g. "GPT-5.6 Luna").
const STOP_WORDS = new Set(['the', 'a', 'an', 'for', 'to', 'of', 'and', 'with', 'best', 'tool', 'app', 'model', 'models']);

export interface SearchHit {
  kind: 'tool' | 'stack' | 'model' | 'dead';
  slug: string;
  name: string;
  tagline: string;
  verdict?: Verdict;
  price_note?: string;
  last_verified: string;
  url: string;
  why: string[];
  score: number;
}

export interface SearchFilters {
  category?: string;
  verdict?: 'ship' | 'situational' | 'skip' | 'radar';
  pricing?: string;
  limit?: number;
}

function tokens(input: string): string[] {
  return input.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/** One weighted haystack field: a relevance weight plus the raw text/list backing it. */
type WeightedField = readonly [weight: number, value: string | string[] | undefined];

function matchScore(fields: WeightedField[], queryTokens: string[]): { score: number; why: string[] } {
  const why = new Set<string>();
  let score = 0;
  for (const [weight, value] of fields) {
    const haystack = tokens(Array.isArray(value) ? value.join(' ') : value ?? '');
    if (haystack.length === 0) continue;
    for (const token of queryTokens) {
      if (haystack.some((word) => word === token || word.startsWith(token))) {
        score += weight;
        why.add(token);
      }
    }
  }
  return { score, why: [...why].slice(0, 3) };
}

function isFresh(lastVerified: string, now: number): boolean {
  const verified = Date.parse(`${lastVerified}T00:00:00Z`);
  return Number.isFinite(verified) && (now - verified) / 86_400_000 <= FRESH_DAYS;
}

/**
 * Per-kind weighted text fields (name/slug outrank a one-line description,
 * which outranks a longer list, which outranks secondary prose). Each kind
 * gets its own function — rather than one loosely-typed picker over `any` —
 * because the four card shapes share no common text field beyond name/slug.
 */
function toolFields(card: ToolCard): WeightedField[] {
  return [
    [5, card.name], [5, card.slug], [3, card.tagline], [3, card.category],
    [2, card.use_for], [1, card.strengths], [1, card.verdict_text],
  ];
}

function stackFields(card: StackCard): WeightedField[] {
  return [[5, card.title], [5, card.slug], [3, card.use_case], [2, card.tools]];
}

function modelFields(card: ModelCard): WeightedField[] {
  return [[5, card.name], [5, card.slug], [3, card.provider], [2, card.best_for], [1, card.avoid_for]];
}

function graveFields(card: GraveCard): WeightedField[] {
  return [[5, card.name], [5, card.slug], [3, card.category], [1, card.cause], [1, card.obituary]];
}

type HitBase = Omit<SearchHit, 'why' | 'score'>;

/**
 * Scores a card and turns it into a hit, or returns undefined if it does not
 * clear MIN_SCORE. The ship/skip nudge and the freshness bonus apply on top
 * of the text match, never in place of one — a card with zero text relevance
 * (score 0) is never bumped into contention by verdict or recency alone.
 */
function buildHit(base: HitBase, fields: WeightedField[], queryTokens: string[], now: number): SearchHit | undefined {
  const { score, why } = matchScore(fields, queryTokens);
  if (score === 0) return undefined;
  let total = score;
  if (base.verdict === 'ship') total += 1;
  if (base.verdict === 'skip') total -= 2;
  if (isFresh(base.last_verified, now)) total += 1;
  if (total < MIN_SCORE) return undefined;
  return { ...base, score: total, why };
}

export function search(index: CatalogIndex, query: string, filters: SearchFilters = {}): SearchHit[] {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return [];
  const now = Date.now();
  const { snapshot } = index;
  const hits: SearchHit[] = [];

  for (const tool of snapshot.tools) {
    if (filters.category && tool.category !== filters.category) continue;
    if (filters.verdict) {
      // 'radar' filter means "no verdict yet" — no card's verdict field ever
      // literally equals the string 'radar', so it cannot be compared like the
      // other three tiers.
      const matchesRadar = filters.verdict === 'radar' && tool.verdict === undefined;
      const matchesTier = filters.verdict !== 'radar' && tool.verdict === filters.verdict;
      if (!matchesRadar && !matchesTier) continue;
    }
    if (filters.pricing && tool.pricing !== filters.pricing) continue;
    const hit = buildHit(
      {
        kind: 'tool', slug: tool.slug, name: tool.name, tagline: tool.tagline, verdict: tool.verdict,
        price_note: tool.price_note, last_verified: tool.last_verified, url: siteUrl('tool', tool.slug),
      },
      toolFields(tool), queryTokens, now,
    );
    if (hit) hits.push(hit);
  }

  // Stacks, models and graves carry neither `verdict` nor `pricing` — a
  // filter on either field can only ever mean "no match" for these kinds, so
  // they are left out entirely rather than silently ignoring the filter.
  if (!filters.verdict && !filters.pricing) {
    for (const stack of snapshot.stacks) {
      const hit = buildHit(
        {
          kind: 'stack', slug: stack.slug, name: stack.title, tagline: stack.use_case,
          price_note: `$${stack.monthly_cost_usd}/mo`, last_verified: stack.last_verified,
          url: siteUrl('stack', stack.slug),
        },
        stackFields(stack), queryTokens, now,
      );
      if (hit) hits.push(hit);
    }
    for (const model of snapshot.models) {
      const hit = buildHit(
        {
          kind: 'model', slug: model.slug, name: model.name,
          tagline: `${model.provider} · ${model.context_window ?? '?'} ctx`,
          price_note: `$${model.price_input_per_mtok}/$${model.price_output_per_mtok} per Mtok`,
          last_verified: model.last_verified, url: siteUrl('model', model.slug),
        },
        modelFields(model), queryTokens, now,
      );
      if (hit) hits.push(hit);
    }
    for (const grave of snapshot.graveyard) {
      const hit = buildHit(
        {
          kind: 'dead', slug: grave.slug, name: grave.name, tagline: `Dead ${grave.died}: ${grave.cause}`,
          last_verified: grave.last_verified, url: siteUrl('grave', grave.slug),
        },
        graveFields(grave), queryTokens, now,
      );
      if (hit) hits.push(hit);
    }
  }

  return hits
    .sort((a, b) => b.score - a.score || b.last_verified.localeCompare(a.last_verified) || a.slug.localeCompare(b.slug))
    .slice(0, filters.limit ?? 10);
}

export function searchText(hits: SearchHit[]): string {
  if (hits.length === 0) return NO_RESULTS_NOTE;
  return hits
    .map((hit) => {
      const label = hit.kind === 'dead' ? 'DEAD' : (hit.verdict ?? hit.kind).toUpperCase();
      const price = hit.price_note ? ` · ${hit.price_note}` : '';
      return `${hit.name} [${label}] — ${hit.tagline}${price} (verified ${hit.last_verified}, matched: ${hit.why.join(', ')}) · ${hit.url}`;
    })
    .join('\n');
}
