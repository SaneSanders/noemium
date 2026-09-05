import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { catalogJson } from '../../lib/catalog-json';

export const GET: APIRoute = async () => {
  const graveyard = await getCollection('graveyard');
  const rows = [...graveyard]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((entry) => ({ slug: entry.id, ...entry.data }));
  return catalogJson({
    source: 'https://github.com/SaneSanders/noemium/tree/main/src/content/graveyard',
    count: rows.length,
    graveyard: rows,
  });
};
