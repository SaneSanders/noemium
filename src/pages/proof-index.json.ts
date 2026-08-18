import { execFileSync } from 'node:child_process';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

function commitFor(path: string): string | null {
  try {
    const hash = execFileSync('git', ['log', '-1', '--format=%h', '--', path], {
      encoding: 'utf8',
    }).trim();
    return hash || null;
  } catch {
    return null;
  }
}

/** Compact proof index for the VERIFIED drawer. Fetched on first stamp click. */
export const GET: APIRoute = async () => {
  const tools = await getCollection('tools');
  const body: Record<
    string,
    {
      name: string;
      last_verified: string;
      observed_by: string;
      receipts: string[];
      path: string;
      commit: string | null;
    }
  > = {};

  for (const t of tools) {
    const path = `src/content/tools/${t.id}.yaml`;
    body[t.id] = {
      name: t.data.name,
      last_verified: t.data.last_verified,
      observed_by: t.data.observed_by,
      receipts: t.data.receipts,
      path,
      commit: commitFor(path),
    };
  }

  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
};
