import { useMemo, useState } from 'preact/hooks';
import { LogoMark } from './ui';

export interface Benchmark {
  name: string;
  score: number | string;
  source: string;
  date: string;
}

export interface ModelRecord {
  slug: string;
  name: string;
  provider: string;
  context_window?: number;
  price_input_per_mtok: number;
  price_output_per_mtok: number;
  price_unit: 'mtok' | 'image' | 'video_second' | 'audio_second' | 'character';
  price_amount?: number;
  // Absent (or 'usd') means dollars. A non-'usd' card is never converted —
  // it renders in its own currency, never with a dollar sign, and never
  // enters a per-task dollar cost (see taskCost below).
  price_currency?: 'usd' | 'cny';
  open_weights: boolean;
  popularity: number;
  best_for: string[];
  avoid_for: string[];
  retiring?: { date: string; successor: string; successorName: string };
  benchmarks?: Benchmark[];
  source_attribution: string;
  logo?: string | null;
}

type Task = 'coding' | 'writing' | 'vision' | 'audio' | 'video' | 'agents';
type SortKey = 'pop' | 'name' | 'provider' | 'ctx' | 'in' | 'out' | 'task';
type PresetKey = 'pdf' | 'chatbot' | 'agent';

const TASKS: Task[] = ['coding', 'writing', 'vision', 'audio', 'video', 'agents'];

const TASK_MATCHERS: Record<Task, RegExp> = {
  coding: /cod/i,
  writing: /writ|draft|author/i,
  vision: /vision|image|multimodal/i,
  audio: /audio|speech|voice|transcri/i,
  video: /video/i,
  agents: /agent|tool use|autonomous/i,
};

const PRESETS: Record<PresetKey, { label: string; hint: string; inTok: number; outTok: number }> = {
  pdf: { label: 'Summarize 50-page PDF', hint: '≈75k in / 2k out', inTok: 75_000, outTok: 2_000 },
  chatbot: {
    label: 'Chatbot month (10k msgs)',
    hint: '≈30M in / 10M out',
    inTok: 30_000_000,
    outTok: 10_000_000,
  },
  agent: {
    label: 'Coding agent session',
    hint: '≈2M in / 500k out',
    inTok: 2_000_000,
    outTok: 500_000,
  },
};

const UNIT_LABEL: Record<ModelRecord['price_unit'], string> = {
  mtok: '/Mtok',
  image: '/image',
  video_second: '/video-sec',
  audio_second: '/audio-sec',
  character: '/char',
};

function formatCtx(ctx?: number): string {
  // Below 1k tokens a context window is meaningless (or absent for
  // unit-priced media models) — render a dash instead of a fake "0k".
  if (!ctx || ctx < 1000) return '—';
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  return `${Math.round(ctx / 1000)}k`;
}

function unpublishedRate(m: ModelRecord): boolean {
  return (
    (m.price_unit ?? 'mtok') === 'mtok' &&
    m.price_input_per_mtok === 0 &&
    m.price_output_per_mtok === 0 &&
    m.price_amount === undefined
  );
}

function formatUsd(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toPrecision(2)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

// Non-USD amount, printed with its currency code — never a dollar sign, and
// never run through formatUsd's dollar-shaped rounding.
function formatCurrencyAmount(value: number, currency: 'usd' | 'cny'): string {
  return currency === 'usd' ? formatUsd(value) : `${value} ${currency.toUpperCase()}`;
}

// `price_input_per_mtok`/`price_output_per_mtok` read 0/0 as a schema
// sentinel whenever the real number lives in `price_amount` instead — either
// because the card is priced per image/video-second/etc, or (seedance-2-5)
// because it is nominally `price_unit: mtok` but its one headline number is
// not an input/output split. Both cases must render `price_amount` in its
// own unit, never the per-Mtok $0/$0 that would read as free.
function isUnitPriced(m: ModelRecord): boolean {
  return m.price_input_per_mtok === 0 && m.price_output_per_mtok === 0 && m.price_amount !== undefined;
}

function taskCost(m: ModelRecord, preset: (typeof PRESETS)[PresetKey]): number | null {
  if (unpublishedRate(m)) return null;
  if ((m.price_unit ?? 'mtok') !== 'mtok') return null;
  if ((m.price_currency ?? 'usd') !== 'usd') return null;
  // A metered-zero card (see isUnitPriced) has no real input/output split to
  // multiply by preset token counts — its 0/0 would otherwise compute a fake
  // $0.00 task cost for a model that is not free.
  if (isUnitPriced(m)) return null;
  return (preset.inTok * m.price_input_per_mtok + preset.outTok * m.price_output_per_mtok) / 1e6;
}

function unitPrice(m: ModelRecord): string | null {
  if (!isUnitPriced(m)) return null;
  return `${formatCurrencyAmount(m.price_amount!, m.price_currency ?? 'usd')}${UNIT_LABEL[m.price_unit]}`;
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
      class={`cursor-pointer rounded-md border-[1.5px] px-3 py-1.5 font-mono text-[13px] font-medium transition-all duration-100 ${
        active
          ? 'border-accent bg-accent text-on-accent'
          : 'border-ink bg-paper text-ink hover:-translate-0.5 hover:border-accent hover:text-accent hover:shadow-hard-sm'
      }`}
    >
      {children}
    </button>
  );
}

export default function ModelTable({ models }: { models: ModelRecord[] }) {
  const [task, setTask] = useState<Task | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [presetKey, setPresetKey] = useState<PresetKey>('pdf');
  const [sortKey, setSortKey] = useState<SortKey>('pop');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const preset = PRESETS[presetKey];

  const rows = useMemo(() => {
    const filtered = models.filter((m) => {
      if (openOnly && !m.open_weights) return false;
      if (task) {
        const haystack = m.best_for.join(' ').toLowerCase();
        if (!TASK_MATCHERS[task].test(haystack)) return false;
      }
      return true;
    });

    const value = (m: ModelRecord): number | string => {
      switch (sortKey) {
        case 'pop':
          return m.popularity;
        case 'name':
          return m.name.toLowerCase();
        case 'provider':
          return m.provider.toLowerCase();
        case 'ctx':
          return m.context_window ?? -1;
        case 'in':
          return m.price_input_per_mtok;
        case 'out':
          return m.price_output_per_mtok;
        case 'task':
          return taskCost(m, preset) ?? Number.POSITIVE_INFINITY;
      }
    };

    // Token-priced models sort among themselves; unit-priced media models
    // always stay at the bottom (their own group, sorted internally).
    const isToken = (m: ModelRecord) => (m.price_unit ?? 'mtok') === 'mtok' && !isUnitPriced(m);
    const tokenRows = filtered.filter(isToken);
    const unitRows = filtered.filter((m) => !isToken(m));
    const cmp = (a: ModelRecord, b: ModelRecord) => {
      const va = value(a);
      const vb = value(b);
      const d =
        typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : Number(va) - Number(vb);
      // popularity is the default tiebreaker so equal prices stay sane
      return d * sortDir || b.popularity - a.popularity;
    };
    tokenRows.sort(cmp);
    unitRows.sort(cmp);
    return [...tokenRows, ...unitRows];
  }, [models, task, openOnly, preset, sortKey, sortDir]);

  const header = (key: SortKey, label: string, className = '') => (
    <th
      scope="col"
      class={`p-0 font-mono text-[13px] font-normal tracking-widest uppercase ${className}`}
      aria-sort={sortKey === key ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        class={`w-full cursor-pointer p-3 text-left select-none ${
          sortKey === key ? 'text-accent' : 'text-ink-dim hover:text-ink'
        }`}
        onClick={() => {
          if (sortKey === key) setSortDir(sortDir === 1 ? -1 : 1);
          else {
            setSortKey(key);
            // Descending reads naturally for "most" metrics (heat, ctx,
            // price); ascending for alphabetical columns.
            setSortDir(key === 'name' || key === 'provider' ? 1 : -1);
          }
        }}
      >
        {label}
        {sortKey === key && <span class="ml-1">{sortDir === 1 ? '↑' : '↓'}</span>}
      </button>
    </th>
  );

  return (
    <section>
      <div class="nm-card space-y-4 p-5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="mr-2 font-mono text-[13px] font-bold tracking-[0.12em] text-ink uppercase">task</span>
          {TASKS.map((t) => (
            <Chip key={t} active={task === t} onClick={() => setTask(task === t ? null : t)}>
              {t}
            </Chip>
          ))}
          <span class="mx-1 h-5 w-px bg-line-soft" aria-hidden="true" />
          <Chip active={openOnly} onClick={() => setOpenOnly(!openOnly)}>
            open weights only
          </Chip>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="mr-2 font-mono text-[13px] font-bold tracking-[0.12em] text-ink uppercase">
            price per task
          </span>
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <Chip key={key} active={presetKey === key} onClick={() => setPresetKey(key)}>
              {PRESETS[key].label}
            </Chip>
          ))}
          <span class="nm-num text-[13px] text-ink-dim">{preset.hint}</span>
        </div>
      </div>

      <div class="nm-card mt-6 overflow-x-auto">
        <table class="w-full min-w-[1120px] border-collapse bg-card text-left">
          <thead>
            <tr class="border-b-[1.5px] border-ink">
              {header('name', 'model', 'sticky left-0 bg-card')}
              <th scope="col" class="p-3 font-mono text-[13px] font-normal tracking-[0.12em] text-ink-dim uppercase">
                status
              </th>
              {header('provider', 'provider')}
              {header('pop', 'heat')}
              {header('ctx', 'ctx')}
              {header('in', '$in /1M')}
              {header('out', '$out /1M')}
              {header('task', preset.label)}
              <th scope="col" class="p-3 font-mono text-[13px] font-normal tracking-[0.12em] text-ink-dim uppercase">
                open
              </th>
              <th scope="col" class="p-3 font-mono text-[13px] font-normal tracking-[0.12em] text-ink-dim uppercase">
                best for
              </th>
              <th scope="col" class="p-3 font-mono text-[13px] font-normal tracking-[0.12em] text-ink-dim uppercase">
                avoid for
              </th>
              <th scope="col" class="p-3 font-mono text-[13px] font-normal tracking-[0.12em] text-ink-dim uppercase">
                benchmarks
              </th>
              <th scope="col" class="p-3 font-mono text-[13px] font-normal tracking-[0.12em] text-ink-dim uppercase">
                source
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const unpublished = unpublishedRate(m);
              const unit = unpublished ? null : unitPrice(m);
              const cost = taskCost(m, preset);
              return (
                <tr
                  key={m.slug}
                  id={m.slug}
                  class="border-b border-line-soft transition-colors duration-100 last:border-b-0 hover:bg-paper"
                >
                  <th
                    scope="row"
                    class="sticky left-0 min-w-56 bg-card p-3 text-left font-body text-[15px] font-bold text-ink"
                  >
                    <span class="flex items-center gap-2.5 whitespace-nowrap">
                      <LogoMark src={m.logo} name={m.name} size="sm" />
                      {m.name}
                    </span>
                  </th>
                  <td class="max-w-48 p-3 align-top">
                    {m.retiring && (
                      <div class="space-y-1">
                        <p class="font-mono text-[14px] font-bold tracking-[0.08em] text-verdict-skip uppercase">
                          Retiring {m.retiring.date}
                        </p>
                        <a
                          href={`#${m.retiring.successor}`}
                          class="block font-mono text-[14px] text-accent hover:underline"
                        >
                          Successor: {m.retiring.successorName}
                        </a>
                      </div>
                    )}
                  </td>
                  <td class="p-3 text-sm text-ink-dim">{m.provider}</td>
                  <td
                    class={`nm-num p-3 text-[13px] font-bold ${
                      m.popularity >= 85 ? 'text-accent' : 'text-ink-dim'
                    }`}
                  >
                    {m.popularity}
                  </td>
                  <td class="nm-num p-3 text-[13px]">{formatCtx(m.context_window)}</td>
                  {unpublished ? (
                    <td class="p-3 font-mono text-[14px] text-ink-dim" colSpan={2}>
                      no public rate — Coding Plan only
                    </td>
                  ) : unit ? (
                    <td class="nm-num p-3 text-[13px]" colSpan={2}>
                      {unit}
                    </td>
                  ) : (
                    <>
                      <td class="nm-num p-3 text-[13px]">
                        {formatUsd(m.price_input_per_mtok)}
                      </td>
                      <td class="nm-num p-3 text-[13px]">
                        {formatUsd(m.price_output_per_mtok)}
                      </td>
                    </>
                  )}
                  <td class="nm-num bg-accent/10 p-3 text-[13px] font-bold text-accent">
                    {cost === null ? '—' : formatUsd(cost)}
                  </td>
                  <td class="p-3 font-mono text-[13px]">
                    {m.open_weights ? (
                      <span class="text-ink">yes</span>
                    ) : (
                      <span class="text-ink-dim">no</span>
                    )}
                  </td>
                  <td class="max-w-64 p-3 text-[13px] text-ink-dim">{m.best_for.slice(0, 2).join('; ')}</td>
                  <td class="max-w-64 p-3 text-[13px] text-ink-dim">{m.avoid_for.slice(0, 2).join('; ')}</td>
                  <td class="max-w-72 p-3">
                    {m.benchmarks && m.benchmarks.length > 0 ? (
                      <ul class="space-y-1">
                        {m.benchmarks.map((b, i) => (
                          <li key={`${b.name}-${i}`} class="font-mono text-[14px]">
                            <span class="text-ink">
                              {b.name}: {b.score}
                            </span>
                            <span class="text-ink-dim"> · {b.source} · {b.date}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span class="font-mono text-[14px] text-ink-dim">—</span>
                    )}
                  </td>
                  <td class="max-w-56 p-3 text-[13px] text-ink-dim">{m.source_attribution}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="nm-num mt-3 text-[13px] text-ink-dim">
        {rows.length} / {models.length} models · sorted by heat — click a column header to re-sort ·
        unit-priced media models stay at the bottom
      </p>
    </section>
  );
}
