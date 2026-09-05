import { readFile } from 'node:fs/promises';

const SNAPSHOT_URL = new URL('../data/snapshot.json', import.meta.url);

/**
 * Loads the real catalog snapshot the honesty tests run against.
 *
 * `mcp/data/snapshot.json` is gitignored and generated, so a fresh clone has
 * no copy of it. Reading it directly makes every one of those test files die
 * at import time with a bare `ENOENT: no such file or directory` and a path,
 * which says nothing about how to produce the file. This says it.
 */
export async function loadRealSnapshot() {
  try {
    return JSON.parse(await readFile(SNAPSHOT_URL, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Missing ${SNAPSHOT_URL.pathname}. These tests run against the real catalog. ` +
          'Generate it from the repo root with: npm run build && npm run mcp:snapshot ' +
          '(the snapshot is built from dist/api/*.json, so the site must be built first).',
        { cause: error },
      );
    }
    throw error;
  }
}
