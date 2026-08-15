import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ToolRecord } from './FilterBar';
import { MomentumArrow, VerdictStamp, YesNo } from './ui';

export interface CompareTool extends ToolRecord {
  self_host: boolean;
  limitations: string[];
}

const MAX_TOOLS = 4;
const MIN_TOOLS = 2;

export default function CompareTable({ tools }: { tools: CompareTool[] }) {
  const bySlug = useMemo(() => new Map(tools.map((t) => [t.slug, t])), [tools]);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const raw = (new URLSearchParams(window.location.search).get('tools') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const valid: string[] = [];
    const missing: string[] = [];
    for (const slug of raw) {
      if (bySlug.has(slug)) {
        if (!valid.includes(slug)) valid.push(slug);
      } else {
        missing.push(slug);
      }
    }
    setSlugs(valid.slice(0, MAX_TOOLS));
    setUnknown(missing);
  }, [bySlug]);

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
        <span class="nm-num text-xs">
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
          <span class="font-mono text-xs text-ink-dim">{t.momentum}</span>
        </span>
      ),
    },
    {
      label: 'known limitations',
      render: (t) => (
        <ul class="list-disc space-y-1 pl-4 text-xs text-ink-dim marker:font-mono marker:text-shift-near">
          {t.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <section>
      <div class="rounded-md border border-line bg-panel p-4">
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
            class="w-full rounded-sm border border-line bg-void px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-dim focus:border-shift-near focus:outline-none disabled:opacity-50"
          />
          {suggestions.length > 0 && (
            <ul class="absolute right-0 left-0 z-10 mt-1 overflow-hidden rounded-sm border border-line bg-raised">
              {suggestions.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    onClick={() => add(t.slug)}
                    class="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left transition-colors duration-100 hover:bg-panel"
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
          <p class="mt-3 font-mono text-xs text-shift-far">
            No observation logged for: {unknown.join(', ')} — check the slugs.
          </p>
        )}
        {selected.length < MIN_TOOLS && (
          <p class="mt-3 text-sm text-ink-dim">
            Pick {MIN_TOOLS}–{MAX_TOOLS} tools to put them side by side — or open{' '}
            <span class="font-mono text-xs text-shift-near">/tools/compare?tools=cursor,aider</span>
            .
          </p>
        )}
      </div>

      {selected.length >= MIN_TOOLS && (
        <div class="mt-6 overflow-x-auto rounded-md border border-line">
          <table class="w-full min-w-[640px] border-collapse bg-panel text-left">
            <thead>
              <tr class="border-b border-line">
                <th class="sticky left-0 w-36 bg-panel p-3 font-mono text-xs tracking-widest text-ink-dim uppercase">
                  field
                </th>
                {selected.map((t) => (
                  <th key={t.slug} class="min-w-48 p-3 align-top">
                    <div class="flex items-start justify-between gap-2">
                      <a
                        href={`/tools/${t.slug}`}
                        class="font-body text-base font-semibold text-ink hover:text-shift-near"
                      >
                        {t.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => remove(t.slug)}
                        aria-label={`Remove ${t.name}`}
                        class="font-mono text-xs text-ink-dim transition-colors duration-100 hover:text-shift-far"
                      >
                        [x]
                      </button>
                    </div>
                    <p class="mt-1 font-mono text-xs text-ink-dim">{t.category}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} class="border-b border-line last:border-b-0">
                  <th
                    scope="row"
                    class="sticky left-0 bg-panel p-3 align-top font-mono text-xs font-normal tracking-widest text-ink-dim uppercase"
                  >
                    {row.label}
                  </th>
                  {selected.map((t) => (
                    <td key={t.slug} class="p-3 align-top text-sm">
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
