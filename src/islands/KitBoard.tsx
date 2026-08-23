import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { KIT_MAX, KIT_STORAGE_KEY, kitHref, mergeKit, parseKitSlugs } from '../lib/kit';
import { LogoMark, VerdictStamp, YesNo, type Verdict } from './ui';

export interface KitTool {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  pricing: 'free' | 'freemium' | 'paid';
  verdict: Verdict;
  open_source: boolean;
  self_host: boolean;
  logo?: string | null;
}

function readStored(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KIT_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeStored(slugs: string[]) {
  try {
    localStorage.setItem(KIT_STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    /* private mode */
  }
}

export default function KitBoard({ catalog }: { catalog: KitTool[] }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const allowed = useMemo(() => catalog.map((tool) => tool.slug), [catalog]);
  const bySlug = useMemo(() => new Map(catalog.map((tool) => [tool.slug, tool])), [catalog]);

  const persist = (next: string[]) => {
    setSlugs(next);
    writeStored(next);
    const href = kitHref(next);
    window.history.replaceState(null, '', href);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = parseKitSlugs(params.get('tools'), allowed);
    const added = parseKitSlugs(params.get('add'), allowed);
    const stored = parseKitSlugs(readStored(), allowed);
    const seed = fromUrl.length ? fromUrl : stored;
    persist(mergeKit(seed, added, allowed));
    setReady(true);
  }, [allowed]);

  const add = (slug: string) => {
    persist(mergeKit(slugs, [slug], allowed));
    setQuery('');
    setHighlighted(0);
  };

  const remove = (slug: string) => persist(slugs.filter((item) => item !== slug));

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((tool) => !slugs.includes(tool.slug))
      .filter((tool) => `${tool.name} ${tool.slug} ${tool.tagline}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalog, slugs, query]);

  const selected = slugs
    .map((slug) => bySlug.get(slug))
    .filter((tool): tool is KitTool => tool !== undefined);

  const shareHref =
    typeof window === 'undefined'
      ? kitHref(slugs)
      : `${window.location.origin}${kitHref(slugs)}`;

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareHref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const compareHref =
    selected.length >= 2 && selected.length <= 4
      ? `/tools/compare/?tools=${selected.map((tool) => tool.slug).join(',')}`
      : null;

  return (
    <div>
      <p class="max-w-2xl text-[15px] leading-relaxed text-ink opacity-80">
        A kit is a shareable set of catalog cards — URL plus this browser. It is not a budget. We
        do not sum monthly prices because most cards do not have a number we can add.
      </p>

      {!ready ? <p class="mt-8 font-mono text-[13px] text-ink-dim">Loading kit…</p> : null}

      <div class={`relative mt-8 max-w-xl ${ready ? '' : 'hidden'}`}>
        <label class="font-mono text-[13px] font-bold tracking-[0.14em] text-ink uppercase" htmlFor="nm-kit-add">
          Add a tool
        </label>
        <input
          id="nm-kit-add"
          ref={inputRef}
          class="nm-field mt-2"
          value={query}
          placeholder={slugs.length >= KIT_MAX ? `Kit is full (${KIT_MAX})` : 'Name or slug'}
          disabled={slugs.length >= KIT_MAX}
          autocomplete="off"
          onInput={(e) => {
            setQuery((e.currentTarget as HTMLInputElement).value);
            setHighlighted(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlighted((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlighted((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              const hit = suggestions[highlighted];
              if (hit) {
                e.preventDefault();
                add(hit.slug);
              }
            } else if (e.key === 'Escape') {
              setQuery('');
            }
          }}
        />
        {suggestions.length > 0 && (
          <ul class="nm-card absolute z-20 mt-2 w-full overflow-hidden py-1" role="listbox">
            {suggestions.map((tool, i) => (
              <li key={tool.slug}>
                <button
                  type="button"
                  class={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === highlighted ? 'bg-paper' : ''}`}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => add(tool.slug)}
                >
                  <LogoMark src={tool.logo} name={tool.name} size="sm" />
                  <span class="min-w-0">
                    <span class="block font-display text-[15px] font-extrabold tracking-tight">{tool.name}</span>
                    <span class="block truncate font-mono text-[11px] text-ink-dim">{tool.category}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p class="mt-2 font-mono text-[12px] text-ink-dim">
          {slugs.length}/{KIT_MAX} cards
        </p>
      </div>

      {selected.length === 0 ? (
        <div class="mt-10 border border-dashed border-ink p-6">
          <p class="font-mono text-[13px] font-bold tracking-[0.12em] text-accent uppercase">Empty kit</p>
          <p class="mt-3 max-w-xl text-[15px] leading-relaxed text-ink opacity-80">
            Add cards above, or start from the{' '}
            <a href="/quiz/" class="text-accent hover:underline">
              quiz
            </a>{' '}
            or a{' '}
            <a href="/tools/compare/?tools=cursor,claude-code" class="text-accent hover:underline">
              compare
            </a>
            .
          </p>
        </div>
      ) : (
        <div class="nm-card mt-10 overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr class="border-b-[1.5px] border-ink">
                <th class="p-3 font-mono text-[12px] font-medium tracking-[0.12em] text-ink-dim uppercase">tool</th>
                <th class="p-3 font-mono text-[12px] font-medium tracking-[0.12em] text-ink-dim uppercase">verdict</th>
                <th class="p-3 font-mono text-[12px] font-medium tracking-[0.12em] text-ink-dim uppercase">price</th>
                <th class="p-3 font-mono text-[12px] font-medium tracking-[0.12em] text-ink-dim uppercase">oss</th>
                <th class="p-3 font-mono text-[12px] font-medium tracking-[0.12em] text-ink-dim uppercase">self-host</th>
                <th class="p-3 font-mono text-[12px] font-medium tracking-[0.12em] text-ink-dim uppercase">
                  <span class="sr-only">remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {selected.map((tool) => (
                <tr class="border-b border-line-soft last:border-b-0" key={tool.slug}>
                  <th scope="row" class="p-3">
                    <a href={`/tools/${tool.slug}/`} class="flex items-center gap-3 hover:text-accent">
                      <LogoMark src={tool.logo} name={tool.name} size="sm" />
                      <span>
                        <span class="block font-display text-[15px] font-extrabold tracking-tight">{tool.name}</span>
                        <span class="block font-mono text-[11px] font-normal text-ink-dim">{tool.category}</span>
                      </span>
                    </a>
                  </th>
                  <td class="p-3">
                    <VerdictStamp verdict={tool.verdict} />
                  </td>
                  <td class="p-3 font-mono text-[13px]">{tool.pricing}</td>
                  <td class="p-3">
                    <YesNo value={tool.open_source} />
                  </td>
                  <td class="p-3">
                    <YesNo value={tool.self_host} />
                  </td>
                  <td class="p-3 text-right">
                    <button
                      type="button"
                      class="font-mono text-[12px] text-ink-dim hover:text-verdict-skip"
                      onClick={() => remove(tool.slug)}
                    >
                      remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p class="mt-4 max-w-2xl font-mono text-[12px] leading-relaxed text-ink-dim">
        Pricing is the catalog enum — free, freemium, paid — not a fake monthly total.
      </p>

      <p class="mt-8 flex flex-wrap gap-3">
        <button type="button" class="nm-btn nm-btn-solid" onClick={copyShare} disabled={selected.length === 0}>
          {copied ? 'Copied share URL' : 'Copy share URL'}
        </button>
        {compareHref && (
          <a href={compareHref} class="nm-btn nm-btn-outline">
            Compare these
          </a>
        )}
        {selected.length > 0 && (
          <button type="button" class="nm-btn nm-btn-outline" onClick={() => persist([])}>
            Clear kit
          </button>
        )}
      </p>
    </div>
  );
}
