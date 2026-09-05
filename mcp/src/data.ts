export type Verdict = 'ship' | 'situational' | 'skip';

// Field shape mirrors `toolSchema` in `src/content-schemas.ts` (the source of
// truth for required vs. optional) plus `slug` and the `alternatives`/`compare`
// fields the snapshot builder (`scripts/mcp-snapshot.mjs`) adds on top.
export interface ToolCard {
  slug: string; name: string; tagline: string; url: string; category: string;
  pricing: string; price_note?: string; free_tier: boolean; open_source: boolean; api: boolean;
  self_host: boolean; models_used?: string[]; model_routing?: string; verdict?: Verdict;
  verdict_text?: string; strengths?: string[]; use_for?: string[]; skip_when?: string[];
  limitations: string[]; receipts: string[]; affiliate: string; affiliate_url?: string;
  evidence_tier: string;
  guide?: {
    install?: string; requirements?: string[]; cost?: string; security?: string;
    breaks_when?: string[];
  };
  momentum: string;
  // `featured` has a zod `.default(false)`, so the parsed output always
  // carries a value — it is required, never absent.
  featured: boolean;
  data_sensitivity?: {
    trains_on_inputs: string; eu_region?: string; local_processing?: boolean;
  };
  last_verified: string; observed_by: string;
  alternatives: string[]; compare: Array<{ pair: string; url: string }>;
}

// Mirrors `modelSchema`.
export interface ModelCard {
  slug: string; name: string; provider: string; context_window?: number;
  price_input_per_mtok: number; price_output_per_mtok: number;
  // `price_unit` has a zod `.default('mtok')` — always present in output.
  price_unit: string; price_amount?: number; open_weights: boolean;
  popularity: number; best_for: string[]; avoid_for: string[];
  retiring?: { date: string; successor: string };
  benchmarks?: Array<{ name: string; score: number | string; source: string; date: string }>;
  source_attribution: string; last_verified: string;
}

// Mirrors `stackSchema`.
export interface StackCard {
  slug: string; title: string; use_case: string; difficulty: string;
  monthly_cost_usd: number; tools: string[]; receipts: string[]; last_verified: string;
  observed_by: string;
  budget?: { monthly_cost_usd: number; tools: string[]; tradeoff: string };
  twin?: { slug: string; kind: string; tradeoff: string };
}

// Mirrors `graveyardSchema`. `succeeded_by` is a REQUIRED discriminated union:
// either a named successor (`successorSchema`) or an explicit `{ none: true }`
// (`noSuccessorSchema`) — never absent, never both. Task 4's `check` tool
// branches on this union to decide whether to name a successor.
export interface GraveCard {
  slug: string; name: string; url: string; category: string; died: string;
  cause: string; obituary: string; receipt: string; last_verified: string;
  succeeded_by:
    | { name: string; slug?: string; url?: string; note: string }
    | { none: true; note: string };
}

export interface Snapshot {
  built: string; counts: Record<string, number>; tools: ToolCard[];
  models: ModelCard[]; stacks: StackCard[]; graveyard: GraveCard[];
}

/**
 * What a normalized key resolved to. `kind` is the card type — model cards are
 * indexed alongside tools and graves so that `check` can answer for a model
 * name instead of claiming the catalog has never heard of it (models carry no
 * `url`, so they only ever produce `via: 'name'` entries). `via` records how
 * the key matched: 'name' for a slug/name hit, 'host' for a URL-host hit. A
 * lookup should prefer 'name' hits — the real catalog has collisions like the
 * "claude" tool vs. the "claude-code" tool's url host (claude.com), which both
 * normalize to "claude".
 */
export type CardKind = 'tool' | 'grave' | 'model';

export interface IndexEntry {
  kind: CardKind;
  slug: string;
  via: 'name' | 'host';
}

export interface CatalogIndex {
  snapshot: Snapshot;
  toolBySlug: Map<string, ToolCard>;
  graveBySlug: Map<string, GraveCard>;
  stackBySlug: Map<string, StackCard>;
  modelBySlug: Map<string, ModelCard>;
  byNormalizedName: Map<string, IndexEntry[]>;
}

const TLD = /\.(com|ai|io|dev|app|so|co|sh|net|org)$/;

export function normalizeName(input: string): string {
  const trimmed = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return trimmed.replace(TLD, '').replace(/[^a-z0-9]/g, '');
}

const PATHS: Record<'tool' | 'stack' | 'model' | 'grave', (slug: string) => string> = {
  tool: (slug) => `/tools/${slug}/`,
  stack: (slug) => `/stacks/${slug}/`,
  model: () => '/models/',
  grave: () => '/graveyard/',
};

export function siteUrl(kind: 'tool' | 'stack' | 'model' | 'grave', slug: string): string {
  return `https://noemium.com${PATHS[kind](slug)}`;
}

/**
 * Slug suggestions for a lookup that found nothing. A suggestion is only ever
 * offered for a query long enough to carry a signal: `slug.includes(key)` with
 * a one- or two-character query matches almost every slug in the catalog, so
 * `tool({slug: "-"})` used to answer with an alphabetical sample of the whole
 * map. Below the minimum the honest answer is "no suggestions".
 */
const MIN_SUGGESTION_QUERY = 3;

export function nearSlugs(keys: Iterable<string>, query: string, cap: number): string[] {
  if (query.length < MIN_SUGGESTION_QUERY) return [];
  return [...keys].filter((key) => key.includes(query) || query.includes(key)).slice(0, cap);
}

export function buildIndex(snapshot: Snapshot): CatalogIndex {
  const byNormalizedName = new Map<string, IndexEntry[]>();
  const add = (key: string, entry: IndexEntry) => {
    const normalized = normalizeName(key);
    if (!normalized) return;
    const bucket = byNormalizedName.get(normalized) ?? [];
    if (!bucket.some((e) => e.kind === entry.kind && e.slug === entry.slug)) bucket.push(entry);
    byNormalizedName.set(normalized, bucket);
  };
  for (const tool of snapshot.tools) {
    add(tool.slug, { kind: 'tool', slug: tool.slug, via: 'name' });
    add(tool.name, { kind: 'tool', slug: tool.slug, via: 'name' });
    if (tool.url) add(tool.url, { kind: 'tool', slug: tool.slug, via: 'host' });
  }
  for (const grave of snapshot.graveyard) {
    add(grave.slug, { kind: 'grave', slug: grave.slug, via: 'name' });
    add(grave.name, { kind: 'grave', slug: grave.slug, via: 'name' });
    if (grave.url) add(grave.url, { kind: 'grave', slug: grave.slug, via: 'host' });
  }
  // Model cards have no `url` field, so they contribute name/slug keys only —
  // there is no model host that could be mistaken for a product name.
  for (const model of snapshot.models) {
    add(model.slug, { kind: 'model', slug: model.slug, via: 'name' });
    add(model.name, { kind: 'model', slug: model.slug, via: 'name' });
  }
  return {
    snapshot,
    toolBySlug: new Map(snapshot.tools.map((t) => [t.slug, t])),
    graveBySlug: new Map(snapshot.graveyard.map((g) => [g.slug, g])),
    stackBySlug: new Map(snapshot.stacks.map((s) => [s.slug, s])),
    modelBySlug: new Map(snapshot.models.map((m) => [m.slug, m])),
    byNormalizedName,
  };
}
