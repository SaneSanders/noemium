import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { catalogJson } from '../../lib/catalog-json';

export const GET: APIRoute = async () => {
  const tools = await getCollection('tools');
  const rows = [...tools]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((t) => ({ slug: t.id, ...t.data }));
  return catalogJson({
    source: 'https://github.com/SaneSanders/noemium/tree/main/src/content/tools',
    count: rows.length,
    tools: rows,
  });
};
