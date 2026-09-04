#!/usr/bin/env node
/**
 * Bakes the catalog into a single JSON snapshot for the MCP worker.
 * Runs after `astro build`, reads the site's own API payloads so the
 * server can never disagree with the site.
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alternativeIds } from '../src/lib/shelf.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (rel) => JSON.parse(await readFile(join(root, rel), 'utf8'));

const MAX_ALTERNATIVES = 6;

/**
 * dist/tools/compare/<a>-vs-<b>/ is the site's own generated compare pages
 * (curated + auto pairs from buildAutoPairs). Reading that directory listing
 * — not re-deriving pairs — means the snapshot's compare links can't drift
 * from or 404 against the live site.
 */
async function compareDirs() {
  try {
    return await readdir(join(root, 'dist/tools/compare'));
  } catch {
    return [];
  }
}

/** Builds a slug -> [{pair, url}] map from the compare directory names. */
function comparePairsBySlug(dirs, toolSlugs) {
  const bySlug = new Map(toolSlugs.map((slug) => [slug, []]));
  for (const dir of dirs) {
    // Directory names are literally `${a}-vs-${b}` (see [pair].astro); find the
    // split point by matching known slugs rather than guessing on `-vs-`.
    const match = toolSlugs.find(
      (slug) => dir.startsWith(`${slug}-vs-`) && toolSlugs.includes(dir.slice(slug.length + 4)),
    );
    if (!match) continue;
    const other = dir.slice(match.length + 4);
    const url = `https://noemium.com/tools/compare/${dir}/`;
    bySlug.get(match).push({ pair: dir, url });
    bySlug.get(other).push({ pair: dir, url });
  }
  return bySlug;
}

const [toolsPayload, modelsPayload, stacksPayload, gravePayload] = await Promise.all([
  readJson('dist/api/tools.json'),
  readJson('dist/api/models.json'),
  readJson('dist/api/stacks.json'),
  readJson('dist/api/graveyard.json'),
]);

const tools = toolsPayload.tools;
const toolSlugs = tools.map((t) => t.slug);
const compareDirNames = await compareDirs();
const compareBySlug = comparePairsBySlug(compareDirNames, toolSlugs);
// shelf.ts's alternativeIds() expects RelatedTool objects keyed `id`; the API
// payloads (and this snapshot) key tools by `slug` (see api/tools.json.ts).
// Same strings, different field name — adapt here rather than in shelf.ts.
const toolsById = tools.map((t) => ({ ...t, id: t.slug }));

const snapshot = {
  built: new Date().toISOString().slice(0, 10),
  counts: {
    tools: toolsPayload.count,
    models: modelsPayload.count,
    stacks: stacksPayload.count,
    graveyard: gravePayload.count,
  },
  tools: tools.map((tool) => ({
    ...tool,
    alternatives: alternativeIds(tool.slug, toolsById).slice(0, MAX_ALTERNATIVES),
    compare: compareBySlug.get(tool.slug) ?? [],
  })),
  models: modelsPayload.models,
  stacks: stacksPayload.stacks,
  graveyard: gravePayload.graveyard,
};

await mkdir(join(root, 'mcp/data'), { recursive: true });
await writeFile(join(root, 'mcp/data/snapshot.json'), JSON.stringify(snapshot), 'utf8');
console.log(
  `mcp snapshot: ${snapshot.counts.tools} tools, ${snapshot.counts.models} models, ` +
    `${snapshot.counts.stacks} stacks, ${snapshot.counts.graveyard} graveyard — built ${snapshot.built}`,
);
