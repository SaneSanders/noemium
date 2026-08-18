import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { catalogJson } from '../../lib/catalog-json';

export const GET: APIRoute = async () => {
  const models = await getCollection('models');
  const rows = [...models]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => ({ slug: m.id, ...m.data }));
  return catalogJson({
    source: 'https://github.com/SaneSanders/noemium/tree/main/src/content/models',
    count: rows.length,
    models: rows,
  });
};
