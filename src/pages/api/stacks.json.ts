import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { catalogJson } from '../../lib/catalog-json';

export const GET: APIRoute = async () => {
  const stacks = await getCollection('stacks');
  const rows = [...stacks]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({ slug: s.id, ...s.data }));
  return catalogJson({
    source: 'https://github.com/SaneSanders/noemium/tree/main/src/content/stacks',
    count: rows.length,
    stacks: rows,
  });
};
