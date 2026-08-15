import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Momentum, Verdict } from './ui';
import { FlagBadge, MomentumArrow, VerdictStamp } from './ui';

export interface ToolRecord {
  slug: string;
  no: number;
  name: string;
  tagline: string;
  category: string;
  pricing: 'free' | 'freemium' | 'paid';
  price_note?: string;
  free_tier: boolean;
  open_source: boolean;
  api: boolean;
  verdict: Verdict;
  momentum: Momentum;
  featured: boolean;
  last_verified: string;
}

const CATEGORIES = [
  'coding',
  'image',
  'video',
  'audio',
  'writing',
  'agents',
  'data',
  'productivity',
  'dev-infra',
  'models-api',
] as const;
const PRICING = ['free', 'freemium', 'paid'] as const;
const VERDICTS: Verdict[] = ['ship', 'situational', 'skip'];
const MOMENTA: Momentum[] = ['blueshift', 'steady', 'redshift'];

interface Filters {
  q: string;
  categories: string[];
  pricing: string[];
  verdicts: Verdict[];
  momenta: Momentum[];
  free_tier: boolean;
  open_source: boolean;
  api: boolean;
}

const EMPTY: Filters = {
  q: '',
  categories: [],
  pricing: [],
  verdicts: [],
  momenta: [],
  free_tier: false,
  open_source: false,
  api: false,
};

function parseUrl(): Filters {
  const p = new URLSearchParams(window.location.search);
  const list = (key: string) => (p.get(key) ?? '').split(',').filter(Boolean);
  const pick = <T extends string>(values: string[], allowed: readonly T[]): T[] =>
    values.filter((v): v is T => (allowed as readonly string[]).includes(v));
  return {
    q: p.get('q') ?? '',
    categories: pick(list('cat'), CATEGORIES),
    pricing: pick(list('pricing'), PRICING),
    verdicts: pick(list('verdict'), VERDICTS),
    momenta: pick(list('momentum'), MOMENTA),
    free_tier: p.get('free') === '1',
    open_source: p.get('oss') === '1',
    api: p.get('api') === '1',
  };
}

function writeUrl(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.categories.length) p.set('cat', f.categories.join(','));
  if (f.pricing.length) p.set('pricing', f.pricing.join(','));
  if (f.verdicts.length) p.set('verdict', f.verdicts.join(','));
  if (f.momenta.length) p.set('momentum', f.momenta.join(','));
  if (f.free_tier) p.set('free', '1');
  if (f.open_source) p.set('oss', '1');
  if (f.api) p.set('api', '1');
  const qs = p.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      class={`rounded-sm border-[1.5px] px-2 py-1 font-mono text-xs transition-all duration-100 ${
        active
          ? 'border-accent bg-accent text-card'
          : 'border-ink text-ink-dim hover:-translate-0.5 hover:text-ink hover:shadow-hard-sm'
      }`}
    >
      {children}
    </button>
  );
}

function ToolCardView({ tool }: { tool: ToolRecord }) {
  const flags: string[] = [];
  if (tool.open_source) flags.push('OSS');
  if (tool.api) flags.push('API');
  if (tool.free_tier) flags.push('FREE TIER');
  return (
    <a
      href={`/tools/${tool.slug}`}
      class="nm-card nm-card-hover group flex flex-col p-6"
    >
      <div class="flex items-start justify-between gap-3">
        <span class="font-mono text-[11px] font-medium tracking-[0.12em] text-ink-dim">
          № {String(tool.no).padStart(3, '0')}
        </span>
        <VerdictStamp verdict={tool.verdict} />
      </div>
      <h3 class="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink group-hover:text-accent">
        {tool.name}
        {tool.featured && (
          <span class="ml-2 align-middle font-mono text-[10px] font-medium tracking-[0.14em] text-accent uppercase">
            featured
          </span>
        )}
      </h3>
      <p class="mt-1 font-mono text-[11px] tracking-[0.08em] text-ink-dim uppercase">
        {tool.category}
      </p>
      <p class="mt-3 flex-1 text-sm leading-relaxed text-ink opacity-80">{tool.tagline}</p>
      {flags.length > 0 && (
        <p class="mt-4 flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <FlagBadge key={flag} label={flag} />
          ))}
        </p>
      )}
      <div class="mt-5 border-t-[1.5px] border-line-soft pt-4">
        <p class="nm-num text-sm font-bold text-accent">
          {tool.pricing}
          {tool.price_note && (
            <span class="block pt-1 text-[13px] font-normal text-ink opacity-60">
              {tool.price_note}
            </span>
          )}
        </p>
        <div class="mt-4 flex items-center justify-between gap-3">
          <span class="nm-verified">Verified {tool.last_verified}</span>
          <MomentumArrow momentum={tool.momentum} />
        </div>
      </div>
    </a>
  );
}

export default function FilterBar({ tools }: { tools: ToolRecord[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFilters(parseUrl());
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const update = (next: Filters) => {
    setFilters(next);
    writeUrl(next);
  };

  const results = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return tools.filter((t) => {
      if (q && !`${t.name} ${t.tagline} ${t.category}`.toLowerCase().includes(q)) return false;
      if (filters.categories.length && !filters.categories.includes(t.category)) return false;
      if (filters.pricing.length && !filters.pricing.includes(t.pricing)) return false;
      if (filters.verdicts.length && !filters.verdicts.includes(t.verdict)) return false;
      if (filters.momenta.length && !filters.momenta.includes(t.momentum)) return false;
      if (filters.free_tier && !t.free_tier) return false;
      if (filters.open_source && !t.open_source) return false;
      if (filters.api && !t.api) return false;
      return true;
    });
  }, [tools, filters]);

  const divider = <span class="mx-2 h-4 w-px bg-line-soft" aria-hidden="true" />;

  return (
    <section>
      <div class="nm-card p-5">
        <input
          ref={searchRef}
          type="search"
          value={filters.q}
          onInput={(e) => update({ ...filters, q: (e.target as HTMLInputElement).value })}
          placeholder="Search the catalog…"
          class="w-full rounded-md border-[1.5px] border-ink bg-paper px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none"
        />
        <div class="mt-4 space-y-3">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="w-20 shrink-0 font-mono text-xs font-medium tracking-[0.12em] text-ink-dim uppercase">
              sector
            </span>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                active={filters.categories.includes(c)}
                onClick={() => update({ ...filters, categories: toggle(filters.categories, c) })}
              >
                {c}
              </Chip>
            ))}
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="w-20 shrink-0 font-mono text-xs font-medium tracking-[0.12em] text-ink-dim uppercase">
              pricing
            </span>
            {PRICING.map((p) => (
              <Chip
                key={p}
                active={filters.pricing.includes(p)}
                onClick={() => update({ ...filters, pricing: toggle(filters.pricing, p) })}
              >
                {p}
              </Chip>
            ))}
            {divider}
            <Chip
              active={filters.free_tier}
              onClick={() => update({ ...filters, free_tier: !filters.free_tier })}
            >
              free tier
            </Chip>
            <Chip
              active={filters.open_source}
              onClick={() => update({ ...filters, open_source: !filters.open_source })}
            >
              open source
            </Chip>
            <Chip
              active={filters.api}
              onClick={() => update({ ...filters, api: !filters.api })}
            >
              api
            </Chip>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="w-20 shrink-0 font-mono text-xs font-medium tracking-[0.12em] text-ink-dim uppercase">
              verdict
            </span>
            {VERDICTS.map((v) => (
              <Chip
                key={v}
                active={filters.verdicts.includes(v)}
                onClick={() => update({ ...filters, verdicts: toggle(filters.verdicts, v) })}
              >
                {v}
              </Chip>
            ))}
            {divider}
            {MOMENTA.map((m) => (
              <Chip
                key={m}
                active={filters.momenta.includes(m)}
                onClick={() => update({ ...filters, momenta: toggle(filters.momenta, m) })}
              >
                {m}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <p class="nm-num mt-6 text-xs text-ink-dim" aria-live="polite">
        {results.length} / {tools.length} entries
      </p>

      {results.length === 0 ? (
        <div class="nm-card mt-6 p-12 text-center">
          <p class="font-display text-3xl font-extrabold tracking-tight uppercase">
            Nothing on this shelf.
          </p>
          <p class="mt-3 text-sm text-ink-dim">
            The catalog is empty under these filters — widen the search.
          </p>
          <button
            type="button"
            onClick={() => update(EMPTY)}
            class="nm-btn nm-btn-outline mt-7"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div class="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((tool) => (
            <ToolCardView key={tool.slug} tool={tool} />
          ))}
        </div>
      )}
    </section>
  );
}
