import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

/** Compact search index consumed by the ⌘K command palette (fetched on first open). */
export const GET: APIRoute = async () => {
  const [tools, stacks, models] = await Promise.all([
    getCollection('tools'),
    getCollection('stacks'),
    getCollection('models'),
  ]);

  const body = {
    tools: tools.map((t) => ({
      slug: t.id,
      name: t.data.name,
      tagline: t.data.tagline,
      category: t.data.category,
      verdict: t.data.verdict,
    })),
    stacks: stacks.map((s) => ({
      slug: s.id,
      title: s.data.title,
      use_case: s.data.use_case,
    })),
    models: models.map((m) => ({
      slug: m.id,
      name: m.data.name,
      provider: m.data.provider,
    })),
  };

  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
};
