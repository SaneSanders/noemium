import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { catalogJson } from '../../lib/catalog-json';
import { buildMapPayload } from '../../lib/map-data';

export const GET: APIRoute = async () => {
  const [tools, models, graveyard] = await Promise.all([
    getCollection('tools'),
    getCollection('models'),
    getCollection('graveyard'),
  ]);
  return catalogJson(buildMapPayload(tools, models, graveyard));
};
