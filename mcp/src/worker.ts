import rawSnapshot from '../data/snapshot.json' with { type: 'json' };
import { catalogCounts, createHandler } from './server.ts';
import type { Snapshot } from './data.ts';

interface Env {
  TELEMETRY?: { writeDataPoint: (point: { blobs?: string[]; doubles?: number[]; indexes?: string[] }) => void };
  TELEMETRY_MODE?: string;
}

// Served instead of a broken snapshot: every count is honestly zero rather
// than absent, so `check`/`search`/`tool`/`stack`/`model` all still run and
// answer "no card for this" — never a crash, never a fabricated card.
const EMPTY_SNAPSHOT: Snapshot = {
  built: 'unavailable',
  counts: { tools: 0, models: 0, stacks: 0, graveyard: 0 },
  tools: [],
  models: [],
  stacks: [],
  graveyard: [],
};

/**
 * `mcp/data/snapshot.json` is gitignored and produced by `npm run mcp:snapshot`
 * at build time, right before this worker is deployed alongside it.
 *
 * A static `import ... with { type: 'json' }` already gives us the strongest
 * guarantee for the "file is missing" or "file is not valid JSON" cases:
 * Wrangler/esbuild fails to bundle at build time, so a broken build never
 * ships — that is the correct place to catch those, loudly, before any
 * traffic is served.
 *
 * What a static import cannot catch is a file that parses as JSON but has
 * the wrong shape: an interrupted snapshot generator, a hand-edit, an empty
 * `{}`. Left unchecked, that would crash `buildIndex` (and so every single
 * request) the first time this module runs in a fresh isolate. This check is
 * the runtime backstop for exactly that case: on a shape mismatch, the
 * worker falls back to `EMPTY_SNAPSHOT` so it keeps answering requests
 * honestly ("no card for this") instead of 500ing on everything, and
 * `/health` reports `ok: false` rather than pretending an empty catalog is
 * healthy.
 */
function isValidSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.built === 'string' &&
    typeof s.counts === 'object' &&
    s.counts !== null &&
    Array.isArray(s.tools) &&
    Array.isArray(s.models) &&
    Array.isArray(s.stacks) &&
    Array.isArray(s.graveyard)
  );
}

/**
 * Builds the Worker's `fetch` handler from a raw (untrusted-shape) snapshot
 * value. Factored out from the module-level `export default` so tests can
 * exercise `/health` and the landing page against a deliberately malformed
 * or shaped-but-empty snapshot, without needing a second copy of
 * `data/snapshot.json` on disk — mirrors `createHandler(snapshot)` in
 * server.ts, which takes the same approach for the MCP handler itself.
 */
export function createWorker(rawSnapshot: unknown) {
  const snapshotValid = isValidSnapshot(rawSnapshot);
  const data: Snapshot = snapshotValid ? rawSnapshot : EMPTY_SNAPSHOT;
  const handler = createHandler(data);

  // The numbers reported to `/health` and the landing page are always the
  // real, indexed array lengths — never the snapshot's own self-declared
  // `counts` field. `counts` can lie (a snapshot can carry `counts: {tools:
  // 331}` alongside an empty `tools: []`) or simply be absent/malformed
  // (`counts: {}`); deriving from what was actually indexed means neither
  // failure mode can produce a dishonest "the catalog is healthy" answer.
  const entries = catalogCounts(data);
  const catalogEmpty = entries.tools === 0 && entries.models === 0 && entries.stacks === 0 && entries.graveyard === 0;
  const healthError = !snapshotValid
    ? 'snapshot missing or malformed at build time; serving an empty catalog'
    : catalogEmpty
      ? 'snapshot parsed but contains no cards; refusing to report a healthy catalog'
      : undefined;
  const healthy = healthError === undefined;

  const LANDING = [
    'Noemium MCP — a maintained map of AI tools, models and stacks with verdicts, prices and death dates.',
    '',
    `Snapshot built ${data.built}: ${entries.tools} tools, ${entries.models} models, ` +
      `${entries.stacks} stacks, ${entries.graveyard} dead products.`,
    '',
    'Connect:',
    '  Claude Code  claude mcp add --transport http noemium https://mcp.noemium.com/mcp',
    '  Codex        codex mcp add noemium --url https://mcp.noemium.com/mcp',
    '',
    'Read-only, no account, no personal data. Source: https://github.com/SaneSanders/noemium',
  ].join('\n');

  return {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname === '/health') {
        return Response.json(
          {
            ok: healthy,
            built: data.built,
            entries,
            ...(healthy ? {} : { error: healthError }),
          },
          { status: healthy ? 200 : 503 },
        );
      }
      if (url.pathname === '/') {
        return new Response(LANDING, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
      if (url.pathname !== '/mcp') return new Response('Not found', { status: 404 });

      const started = Date.now();
      const response = await handler.fetch(request);
      if (env.TELEMETRY && env.TELEMETRY_MODE !== 'off') {
        // Request-level telemetry only: method, status, duration. Fire-and-forget
        // via waitUntil, so it can never block or alter the response. Never
        // record headers, IPs, user agents or any request body — and never parse
        // the MCP JSON-RPC body here to extract a tool name for a per-tool
        // counter, even though that would be easy to bolt on. If per-tool detail
        // is wanted later, thread an optional `onCall` callback through
        // `createHandler` (it already sees each tool's args after they've been
        // validated) instead of sniffing the wire format in this fetch handler.
        ctx.waitUntil(
          (async () => {
            try {
              env.TELEMETRY!.writeDataPoint({
                blobs: [request.method, String(response.status)],
                doubles: [Date.now() - started],
                indexes: ['mcp'],
              });
            } catch {
              // Telemetry must never affect the answer.
            }
          })(),
        );
      }
      return response;
    },
  };
}

export default createWorker(rawSnapshot);
