import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ToolRecord } from './FilterBar';
import { MomentumArrow, VerdictStamp, YesNo } from './ui';

export interface CompareTool extends ToolRecord {
  self_host: boolean;
  limitations: string[];
}

const MAX_TOOLS = 4;
const MIN_TOOLS = 2;

// Classic matchups to start from; slugs that vanish from the catalog are
// filtered out at render time.
const PRESETS: [string, string][] = [
  ['cursor', 'claude-code'],
  ['github-copilot', 'cursor'],
  ['midjourney', 'flux'],
  ['elevenlabs', 'murf'],
  ['perplexity', 'chatgpt'],
];

const DEFAULT_SLUGS = ['cursor', 'claude-code'];

export default function CompareTable() {
  const [tools, setTools] = useState<CompareTool[]>([]);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [ready, setReady] = useState(false);

  const bySlug = useMemo(() => new Map(tools.map((t) => [t.slug, t])), [tools]);

  useEffect(() => {
    fetch('/compare-index.json')
      .then((r) => r.json())
      .then((data: CompareTool[]) => {
        setTools(data);
        const map = new Map(data.map((t) => [t.slug, t]));
        const raw = (new URLSearchParams(window.location.search).get('tools') ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const seed = raw.length ? raw : DEFAULT_SLUGS;
        const valid: string[] = [];
        const missing: string[] = [];
        for (const slug of seed) {
          if (map.has(slug)) {
            if (!valid.includes(slug)) valid.push(slug);
          } else if (raw.length) {
            missing.push(slug);
          }
        }
        setSlugs(valid.slice(0, MAX_TOOLS));
        setUnknown(missing);
        if (!raw.length && valid.length) {
          const p = new URLSearchParams(window.location.search);
          p.set('tools', valid.join(','));
          window.history.replaceState(null, '', `?${p.toString()}`);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const update = (next: string[]) => {
    setSlugs(next);
    const p = new URLSearchParams(window.location.search);
    if (next.length) p.set('tools', next.join(','));
    else p.delete('tools');
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  };

  const add = (slug: string) => {
    if (slugs.includes(slug) || slugs.length >= MAX_TOOLS) return;
    update([...slugs, slug]);
    setQuery('');
  };

  const remove = (slug: string) => update(slugs.filter((s) => s !== slug));

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tools
      .filter((t) => !slugs.includes(t.slug))
      .filter((t) => `${t.name} ${t.slug}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [tools, slugs, query]);

  const selected = slugs
    .map((s) => bySlug.get(s))
    .filter((t): t is CompareTool => t !== undefined);

  const rows: { label: string; render: (t: CompareTool) => preact.ComponentChildren }[] = [
    {
      label: 'pricing',
      render: (t) => (
        <span class="nm-num text-[13px]">
          {t.pricing}
          {t.price_note && <span class="text-ink-dim"> · {t.price_note}</span>}
        </span>
      ),
    },
    { label: 'free tier', render: (t) => <YesNo value={t.free_tier} /> },
    { label: 'open source', render: (t) => <YesNo value={t.open_source} /> },
    { label: 'api', render: (t) => <YesNo value={t.api} /> },
    { label: 'self-host', render: (t) => <YesNo value={t.self_host} /> },
    { label: 'verdict', render: (t) => <VerdictStamp verdict={t.verdict} /> },
    {
      label: 'momentum',
      render: (t) => (
        <span class="inline-flex items-center gap-1.5">
          <MomentumArrow momentum={t.momentum} />
          <span class="font-mono text-[13px] text-ink-dim">{t.momentum}</span>
        </span>
      ),
    },
    {
      label: 'known limitations',
      render: (t) => (
        <ul class="list-disc space-y-1 pl-4 text-[13px] text-ink-dim marker:font-mono marker:text-verdict-skip">
          {t.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ),
    },
  ];

  if (!ready) {
    return <p class="font-mono text-sm text-ink-dim">loading compare index…</p>;
  }

  return (
    <section>
      <div class="nm-card p-5">
        <div class="relative">
          <input
            type="text"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder={
              slugs.length >= MAX_TOOLS
                ? `Maximum ${MAX_TOOLS} tools — remove one to add another`
                : 'Add a tool to compare…'
            }
            disabled={slugs.length >= MAX_TOOLS}
            class="w-full rounded-md border-[1.5px] border-ink bg-paper px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none disabled:opacity-50"
          />
          {suggestions.length > 0 && (
            <ul class="absolute right-0 left-0 z-10 mt-1 overflow-hidden rounded-md border-[1.5px] border-ink bg-card shadow-hard">
              {suggestions.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    onClick={() => add(t.slug)}
                    class="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left transition-colors duration-100 hover:bg-paper"
                  >
                    <span class="text-sm text-ink">{t.name}</span>
                    <span class="font-mono text-xs text-ink-dim">{t.slug}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {unknown.length > 0 && (
          <p class="mt-3 font-mono text-xs text-verdict-skip">
            No observation logged for: {unknown.join(', ')} — check the slugs.
          </p>
        )}
        {selected.length < MIN_TOOLS && (
          <div class="mt-3">
            <p class="text-[15px] text-ink-dim">
              Pick {MIN_TOOLS}–{MAX_TOOLS} tools to put them side by side — or start from a classic
              matchup:
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              {PRESETS.filter(([a, b]) => bySlug.has(a) && bySlug.has(b)).map(([a, b]) => (
                <button
                  type="button"
                  onClick={() => update([a, b])}
                  class="nm-num cursor-pointer rounded-md border-[1.5px] border-ink px-3 py-1.5 text-[13px] font-bold text-ink transition-all duration-100 hover:-translate-y-0.5 hover:border-accent hover:text-accent"
                >
                  {bySlug.get(a)!.name}
                  <span class="mx-1.5 font-mono text-[11px] font-normal tracking-wider text-ink-dim uppercase">vs</span>
                  {bySlug.get(b)!.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selected.length >= MIN_TOOLS && (
        <div class="nm-card mt-6 overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse bg-card text-left">
            <thead>
              <tr class="border-b-[1.5px] border-ink">
                <th class="sticky left-0 w-36 bg-card p-3 font-mono text-[13px] font-medium tracking-[0.12em] text-ink-dim uppercase">
                  field
                </th>
                {selected.map((t) => (
                  <th key={t.slug} class="min-w-48 p-3 align-top">
                    <div class="flex items-start justify-between gap-2">
                      <a
                        href={`/tools/${t.slug}/`}
                        class="font-display text-lg font-extrabold tracking-tight text-ink hover:text-accent"
                      >
                        {t.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => remove(t.slug)}
                        aria-label={`Remove ${t.name}`}
                        title={`Remove ${t.name}`}
                        class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-ink font-mono text-lg font-bold text-ink transition-all duration-100 hover:-translate-0.5 hover:border-verdict-skip hover:text-verdict-skip hover:shadow-hard-sm"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                    <p class="mt-1 font-mono text-[13px] text-ink-dim">{t.category}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} class="border-b border-line-soft last:border-b-0">
                  <th
                    scope="row"
                    class="sticky left-0 bg-card p-3 align-top font-mono text-[13px] font-normal tracking-[0.12em] text-ink-dim uppercase"
                  >
                    {row.label}
                  </th>
                  {selected.map((t) => (
                    <td key={t.slug} class="p-3 align-top text-[15px]">
                      {row.render(t)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
