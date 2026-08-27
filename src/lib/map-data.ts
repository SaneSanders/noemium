import type { CollectionEntry } from 'astro:content';
import changelog from '../data/changelog.json';

export const MAP_REGIONS = [
  { id: 'code', label: 'Code', categories: ['coding'] },
  { id: 'infra', label: 'Infra', categories: ['dev-infra', 'data', 'mcp'] },
  { id: 'apis', label: 'APIs', categories: ['models-api'] },
  { id: 'agents', label: 'Agents', categories: ['agents', 'automation'] },
  { id: 'design', label: 'Design', categories: ['design'] },
  { id: 'image', label: 'Image', categories: ['image'] },
  { id: 'video', label: 'Video', categories: ['video'] },
  { id: 'audio', label: 'Audio', categories: ['audio'] },
  { id: 'assistants', label: 'Assistants', categories: ['productivity', 'writing'] },
] as const;

type RegionId = (typeof MAP_REGIONS)[number]['id'];

type Week = {
  id: string;
  added: { slug: string; collection: string }[];
};

function regionOf(category: string): RegionId {
  return MAP_REGIONS.find((r) => (r.categories as readonly string[]).includes(category))?.id ?? 'assistants';
}

function place(
  tool: CollectionEntry<'tools'>['data'],
  slug: string,
  freshSlugs: Set<string>,
): { band: string; t: number } {
  if (tool.verdict === 'ship') {
    let depth = 0.5;
    if (tool.momentum === 'blueshift') depth -= 0.28;
    if (tool.momentum === 'redshift') depth += 0.28;
    if (tool.featured) depth += 0.12;
    return { band: 'land', t: Math.max(0.05, Math.min(0.95, depth)) };
  }
  if (tool.verdict === 'skip') return { band: 'crust', t: 0.5 };

  let t = 0.45;
  if (!tool.verdict) t += 0.16;
  if (tool.momentum === 'blueshift') t += 0.28;
  if (tool.momentum === 'redshift') t -= 0.26;
  if (freshSlugs.has(slug)) t += 0.14;
  if (tool.evidence_tier === 'radar') t += 0.1;
  if (tool.evidence_tier === 'field-tested') t -= 0.12;
  if (tool.featured) t -= 0.08;
  return { band: 'sky', t: Math.max(0.04, Math.min(0.99, t)) };
}

export function buildMapPayload(
  tools: CollectionEntry<'tools'>[],
  models: CollectionEntry<'models'>[],
  graveyard: CollectionEntry<'graveyard'>[],
) {
  const latestWeek = (changelog as { weeks: Week[] }).weeks[0];
  const freshSlugs = new Set(
    (latestWeek?.added ?? []).filter((item) => item.collection === 'tools').map((item) => item.slug),
  );

  const nodes: {
    kind: 'tool' | 'dead';
    slug: string;
    name: string;
    tagline: string;
    category: string;
    region: RegionId;
    verdict: string;
    momentum: string;
    pricing?: string;
    free_tier?: boolean;
    open_source?: boolean;
    featured?: boolean;
    last_verified?: string;
    evidence_tier?: string;
    fresh: boolean;
    band: string;
    level: number;
  }[] = tools.map((t) => {
    const { band, t: level } = place(t.data, t.id, freshSlugs);
    return {
      kind: 'tool',
      slug: t.id,
      name: t.data.name,
      tagline: t.data.tagline,
      category: t.data.category,
      region: regionOf(t.data.category),
      verdict: t.data.verdict ?? 'radar',
      momentum: t.data.momentum,
      pricing: t.data.pricing,
      free_tier: t.data.free_tier,
      open_source: t.data.open_source,
      featured: t.data.featured,
      last_verified: t.data.last_verified,
      evidence_tier: t.data.evidence_tier,
      fresh: freshSlugs.has(t.id),
      band,
      level,
    };
  });

  for (const g of graveyard) {
    nodes.push({
      kind: 'dead',
      slug: g.id,
      name: g.data.name,
      tagline: `died ${g.data.died}`,
      category: g.data.category,
      region: regionOf(g.data.category),
      verdict: 'dead',
      momentum: 'redshift',
      fresh: false,
      band: 'under',
      level: 0.5,
    });
  }

  const stars = models.map((m) => ({
    slug: m.id,
    name: m.data.name,
    provider: m.data.provider,
    popularity: m.data.popularity ?? 0,
    open_weights: !!m.data.open_weights,
    retiring: m.data.retiring?.date ?? null,
    context_window: m.data.context_window ?? null,
    price_in: m.data.price_input_per_mtok ?? null,
    price_out: m.data.price_output_per_mtok ?? null,
  }));

  return {
    generated_at: new Date().toISOString(),
    regions: MAP_REGIONS.map(({ id, label }) => ({ id, label })),
    counts: {
      tools: tools.length,
      models: stars.length,
      dead: graveyard.length,
      fresh: freshSlugs.size,
      ship: tools.filter((t) => t.data.verdict === 'ship').length,
      situational: tools.filter((t) => t.data.verdict === 'situational').length,
      skip: tools.filter((t) => t.data.verdict === 'skip').length,
      radar: tools.filter((t) => t.data.evidence_tier === 'radar').length,
    },
    fresh_week: latestWeek?.id ?? null,
    nodes,
    stars,
  };
}
