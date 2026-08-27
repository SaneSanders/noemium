import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { logoSrc, providerLogoSrc } from '../lib/logos';

/** Compact search index consumed by the ⌘K command palette (fetched on first open). */
export const GET: APIRoute = async () => {
  const [tools, stacks, models, agents, skills] = await Promise.all([
    getCollection('tools'),
    getCollection('stacks'),
    getCollection('models'),
    getCollection('agents'),
    getCollection('skills'),
  ]);

  const body = {
    tools: tools.map((t) => ({
      slug: t.id,
      name: t.data.name,
      tagline: t.data.tagline,
      category: t.data.category,
      verdict: t.data.verdict ?? 'radar',
      logo: logoSrc(t.id),
    })),
    stacks: stacks.map((s) => ({
      slug: s.id,
      title: s.data.title,
      use_case: s.data.use_case,
      logo: logoSrc(s.data.tools[0] ?? ''),
    })),
    models: models.map((m) => ({
      slug: m.id,
      name: m.data.name,
      provider: m.data.provider,
      logo: providerLogoSrc(m.data.provider),
    })),
    agents: agents.map((a) => ({
      slug: a.id,
      name: a.data.name,
      tagline: a.data.tagline,
      agent_layer: a.data.agent_layer,
      evidence_tier: a.data.evidence_tier,
      logo: logoSrc(a.id),
    })),
    skills: skills.map((s) => ({
      slug: s.id,
      name: s.data.name,
      tagline: s.data.tagline,
      evidence_tier: s.data.evidence_tier,
      compatible: s.data.compatible,
    })),
  };

  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
};
