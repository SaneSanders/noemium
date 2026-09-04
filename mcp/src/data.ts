export type Verdict = 'ship' | 'situational' | 'skip';

export interface ToolCard {
  slug: string; name: string; tagline: string; url: string; category: string;
  pricing?: string; price_note?: string; free_tier?: boolean; open_source?: boolean; api?: boolean;
  self_host?: boolean; models_used?: string[]; model_routing?: string; verdict?: Verdict;
  verdict_text?: string; strengths?: string[]; use_for?: string[]; skip_when?: string[];
  limitations?: string[]; receipts?: string[]; affiliate?: string; momentum?: string;
  evidence_tier?: string; last_verified: string; alternatives: string[];
  compare: Array<{ pair: string; url: string }>;
}

export interface ModelCard {
  slug: string; name: string; provider: string; context_window?: number;
  price_input_per_mtok?: number; price_output_per_mtok?: number; open_weights?: boolean;
  best_for?: string[]; avoid_for?: string[]; source_attribution?: string; last_verified: string;
}

export interface StackCard {
  slug: string; title: string; use_case: string; difficulty?: string;
  monthly_cost_usd?: number; tools: string[]; receipts?: string[]; last_verified: string;
  budget?: { monthly_cost_usd?: number; tools?: string[] };
}

export interface GraveCard {
  slug: string; name: string; url: string; category?: string; died: string;
  cause: string; obituary?: string; receipt?: string; last_verified: string;
  succeeded_by?: { name?: string; url?: string; note?: string; none?: boolean };
}

export interface Snapshot {
  built: string; counts: Record<string, number>; tools: ToolCard[];
  models: ModelCard[]; stacks: StackCard[]; graveyard: GraveCard[];
}

export interface CatalogIndex {
  snapshot: Snapshot;
  toolBySlug: Map<string, ToolCard>;
  graveBySlug: Map<string, GraveCard>;
  stackBySlug: Map<string, StackCard>;
  modelBySlug: Map<string, ModelCard>;
  // via records how the normalized key was matched: 'name' for a slug/name hit,
  // 'host' for a URL-host hit. A lookup should prefer 'name' hits — the real
  // catalog has collisions like the "claude" tool vs. the "claude-code" tool's
  // url host (claude.com), which both normalize to "claude".
  byNormalizedName: Map<string, Array<{ kind: 'tool' | 'grave'; slug: string; via: 'name' | 'host' }>>;
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

export function buildIndex(snapshot: Snapshot): CatalogIndex {
  const byNormalizedName = new Map<string, Array<{ kind: 'tool' | 'grave'; slug: string; via: 'name' | 'host' }>>();
  const add = (key: string, entry: { kind: 'tool' | 'grave'; slug: string; via: 'name' | 'host' }) => {
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
  return {
    snapshot,
    toolBySlug: new Map(snapshot.tools.map((t) => [t.slug, t])),
    graveBySlug: new Map(snapshot.graveyard.map((g) => [g.slug, g])),
    stackBySlug: new Map(snapshot.stacks.map((s) => [s.slug, s])),
    modelBySlug: new Map(snapshot.models.map((m) => [m.slug, m])),
    byNormalizedName,
  };
}
