import rawSnapshot from '../data/snapshot.json' with { type: 'json' };
import { createHandler } from './server.ts';
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

const snapshotValid = isValidSnapshot(rawSnapshot);
const data: Snapshot = snapshotValid ? (rawSnapshot as Snapshot) : EMPTY_SNAPSHOT;
const handler = createHandler(data);

const LANDING = [
  'Noemium MCP — a maintained map of AI tools, models and stacks with verdicts, prices and death dates.',
  '',
  `Snapshot built ${data.built}: ${data.counts.tools} tools, ${data.counts.models} models, ` +
    `${data.counts.stacks} stacks, ${data.counts.graveyard} dead products.`,
  '',
  'Connect:',
  '  Claude Code  claude mcp add --transport http noemium https://mcp.noemium.com/mcp',
  '  Codex        codex mcp add noemium --url https://mcp.noemium.com/mcp',
  '',
  'Read-only, no account, no personal data. Source: https://github.com/SaneSanders/noemium',
].join('\n');

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json(
        {
          ok: snapshotValid,
          built: data.built,
          entries: data.counts,
          ...(snapshotValid ? {} : { error: 'snapshot missing or malformed at build time; serving an empty catalog' }),
        },
        { status: snapshotValid ? 200 : 503 },
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
