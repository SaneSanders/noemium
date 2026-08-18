import { getCollection, type CollectionEntry } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';
import { catalogJson } from '../../lib/catalog-json';

export const getStaticPaths = (async () => {
  const tools = await getCollection('tools');
  return tools.map((tool) => ({ params: { slug: tool.id }, props: { tool } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { tool } = props as { tool: CollectionEntry<'tools'> };
  const t = tool.data;
  return catalogJson({
    ...t,
    slug: tool.id,
    url: t.url,
    canonical_url: `https://noemium.com/tools/${tool.id}/`,
    attribution:
      'Noemium catalog data is licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). See https://noemium.com/method/ for how entries are verified.',
  });
};
