import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { logoSrc } from '../lib/logos';

/** Compare payload — fetched by the island so the HTML isn't 157 full cards. */
export const GET: APIRoute = async () => {
  const tools = await getCollection('tools');
  const body = tools
    .map((t) => ({
      slug: t.id,
      name: t.data.name,
      tagline: t.data.tagline,
      category: t.data.category,
      pricing: t.data.pricing,
      price_note: t.data.price_note,
      free_tier: t.data.free_tier,
      open_source: t.data.open_source,
      api: t.data.api,
      self_host: t.data.self_host,
      verdict: t.data.verdict,
      momentum: t.data.momentum,
      featured: t.data.featured,
      last_verified: t.data.last_verified,
      limitations: t.data.limitations,
      logo: logoSrc(t.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
};
