import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { isBuilderKit, plural } from '../lib/shelf';
import type { Momentum, Verdict } from './ui';
import { FlagBadge, MomentumArrow, VerdictStamp } from './ui';

export interface ToolRecord {
  slug: string;
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
  logo?: string | null;
  observed_by?: string;
}

const CATEGORIES = [
  'coding',
  'design',
  'image',
  'video',
  'audio',
  'writing',
  'agents',
  'automation',
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
  kit: boolean;
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
  kit: false,
};

// Layer-1 presets: one click applies a whole filter bundle.
const PRESETS: { key: string; label: string; apply: Partial<Filters> }[] = [
  { key: 'free-oss', label: 'free + open source', apply: { free_tier: true, open_source: true } },
  { key: 'ship', label: 'ship it only', apply: { verdicts: ['ship'] } },
  { key: 'gaining', label: 'gaining (blueshift)', apply: { momenta: ['blueshift'] } },
  { key: 'api', label: 'has API', apply: { api: true } },
  { key: 'kit', label: 'builder kit', apply: { kit: true } },
];

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
    kit: p.get('kit') === '1',
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
  if (f.kit) p.set('kit', '1');
  const qs = p.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function presetActive(f: Filters, apply: Partial<Filters>): boolean {
  return Object.entries(apply).every(([k, v]) => {
    const cur = f[k as keyof Filters];
    return Array.isArray(v) ? (cur as unknown[]).length > 0 && v.every((x) => (cur as unknown[]).includes(x)) : cur === v;
  });
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
      class={`cursor-pointer rounded-md border-[1.5px] px-3.5 py-2 font-mono text-sm font-medium transition-all duration-100 ${
        active
          ? 'border-accent bg-accent text-on-accent'
          : 'border-ink bg-paper text-ink hover:-translate-0.5 hover:border-accent hover:text-accent hover:shadow-hard-sm'
      }`}
    >
      {children}
    </button>
  );
}

function Logo({ name, src }: { name: string; src?: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width="32"
        height="32"
        loading="lazy"
        class="h-8 w-8 shrink-0 rounded-sm border-[1.5px] border-ink bg-card object-contain p-0.5"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-ink bg-paper font-display text-lg font-black text-accent"
    >
      {name.charAt(0)}
    </span>
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
        <span class="font-mono text-[13px] font-medium tracking-[0.1em] text-ink-dim uppercase">
          {tool.category}
        </span>
        <VerdictStamp verdict={tool.verdict} />
      </div>
      <div class="mt-4 flex items-center gap-3">
        <Logo name={tool.name} src={tool.logo} />
        <h3 class="font-display text-2xl font-extrabold tracking-tight text-ink group-hover:text-accent">
          {tool.name}
          {tool.featured && (
            <span
              class="ml-2 align-middle font-mono text-[11px] font-medium tracking-[0.14em] text-accent uppercase"
              title="Editorial mix on the floor — not a paid placement"
            >
              anchor
            </span>
          )}
        </h3>
      </div>
      <p class="mt-3 flex-1 text-[15px] leading-relaxed text-ink opacity-80">{tool.tagline}</p>
      {flags.length > 0 && (
        <p class="mt-4 flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <FlagBadge key={flag} label={flag} />
          ))}
        </p>
      )}
      <div class="mt-5 border-t-[1.5px] border-line-soft pt-4">
        <p class="nm-num text-[15px] font-bold text-accent">
          {tool.pricing}
          {tool.free_tier && tool.pricing === 'paid' && (
            <span class="block pt-1 text-[13px] font-normal text-ink opacity-60">
              free allowance — paid to keep using
            </span>
          )}
          {tool.price_note && (
            <span class="block pt-1 text-[13px] font-normal text-ink opacity-60">
              {tool.price_note}
            </span>
          )}
        </p>
        <div class="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            class="nm-verified cursor-pointer hover:bg-accent hover:text-on-accent"
            data-proof-slug={tool.slug}
            aria-haspopup="dialog"
            aria-label={`Open proof drawer for verification on ${tool.last_verified}`}
          >
            Verified {tool.last_verified}
          </button>
          <MomentumArrow momentum={tool.momentum} />
        </div>
      </div>
    </a>
  );
}

export default function FilterBar({ tools }: { tools: ToolRecord[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [fineOpen, setFineOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initial = parseUrl();
    setFilters(initial);
    // Landing from a category tile with fine filters in the URL opens layer 2.
    if (initial.pricing.length || initial.verdicts.length || initial.momenta.length) {
      setFineOpen(true);
    }
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

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const source = filters.kit
      ? tools
      : tools.filter((t) => !isBuilderKit({ slug: t.slug, category: t.category, tagline: t.tagline }));
    for (const t of source) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    return counts;
  }, [tools, filters.kit]);

  const results = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return tools.filter((t) => {
      const kit = isBuilderKit({ slug: t.slug, category: t.category, tagline: t.tagline });
      if (kit && !filters.kit && !q) return false;
      if (filters.kit && !kit && !q) return false;
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

  const fineActiveCount =
    filters.pricing.length +
    filters.verdicts.length +
    filters.momenta.length +
    (filters.free_tier ? 1 : 0) +
    (filters.open_source ? 1 : 0) +
    (filters.api ? 1 : 0);

  return (
    <section>
      {/* ------------------------------------------------ layer 1: the big decisions */}
      <div class="nm-card p-5 md:p-6">
        <input
          ref={searchRef}
          type="search"
          value={filters.q}
          onInput={(e) => update({ ...filters, q: (e.target as HTMLInputElement).value })}
          placeholder="Search the catalog…  ( / )"
          class="w-full rounded-md border-[1.5px] border-ink bg-paper px-4 py-3 font-mono text-base text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none"
        />

        <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const active = filters.categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => update({ ...filters, categories: toggle(filters.categories, c) })}
                class={`cursor-pointer rounded-md border-[1.5px] px-4 py-3 text-left transition-all duration-100 ${
                  active
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-ink bg-paper text-ink hover:-translate-0.5 hover:border-accent hover:shadow-hard-sm'
                }`}
              >
                <span class="block font-display text-base font-extrabold tracking-tight uppercase">
                  {c}
                </span>
                <span
                  class={`nm-num mt-0.5 block text-[13px] ${active ? 'text-on-accent opacity-75' : 'text-ink-dim'}`}
                >
                  {plural(categoryCounts.get(c) ?? 0, 'tool')}
                </span>
              </button>
            );
          })}
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="mr-1 font-mono text-[13px] font-bold tracking-[0.12em] text-ink uppercase">
            presets
          </span>
          {PRESETS.map((p) => (
            <Chip
              key={p.key}
              active={presetActive(filters, p.apply)}
              onClick={() => {
                const on = presetActive(filters, p.apply);
                const next = { ...filters };
                for (const [k, v] of Object.entries(p.apply)) {
                  const key = k as keyof Filters;
                  if (Array.isArray(v)) {
                    next[key] = (on
                      ? (next[key] as unknown[]).filter((x) => !v.includes(x as never))
                      : [...new Set([...(next[key] as unknown[]), ...v])]) as never;
                  } else {
                    next[key] = (on ? false : v) as never;
                  }
                }
                update(next);
                if (!on) setFineOpen(true);
              }}
            >
              {p.label}
            </Chip>
          ))}
          <button
            type="button"
            onClick={() => setFineOpen(!fineOpen)}
            aria-expanded={fineOpen}
            class="ml-auto cursor-pointer font-mono text-sm font-medium text-accent hover:underline"
          >
            {fineOpen ? 'hide fine tune ↑' : `fine tune ↓${fineActiveCount ? ` (${fineActiveCount} on)` : ''}`}
          </button>
        </div>

        {/* -------------------------------------------- layer 2: fine tune */}
        {fineOpen && (
          <div class="nm-step mt-5 space-y-4 border-t-[1.5px] border-line-soft pt-5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="w-24 shrink-0 font-mono text-[13px] font-bold tracking-[0.12em] text-ink uppercase">
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
              <span class="mx-1 h-5 w-px bg-line-soft" aria-hidden="true" />
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
              <Chip active={filters.api} onClick={() => update({ ...filters, api: !filters.api })}>
                api
              </Chip>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="w-24 shrink-0 font-mono text-[13px] font-bold tracking-[0.12em] text-ink uppercase">
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
              <span class="mx-1 h-5 w-px bg-line-soft" aria-hidden="true" />
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
        )}
      </div>

      <p class="nm-num mt-6 text-sm text-ink-dim" aria-live="polite">
        {results.length} / {tools.length} entries
      </p>

      {results.length === 0 ? (
        <div class="nm-card mt-6 p-12 text-center">
          <p class="font-display text-3xl font-extrabold tracking-tight uppercase">
            Nothing on this shelf.
          </p>
          <p class="mt-3 text-[15px] text-ink-dim">
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
