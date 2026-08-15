import { useMemo, useState } from 'preact/hooks';

export interface ModelRecord {
  slug: string;
  name: string;
  provider: string;
  context_window?: number;
  price_input_per_mtok: number;
  price_output_per_mtok: number;
  price_unit: 'mtok' | 'image' | 'video_second' | 'audio_second' | 'character';
  price_amount?: number;
  open_weights: boolean;
  best_for: string[];
}

type Task = 'coding' | 'writing' | 'vision' | 'audio' | 'video' | 'agents';
type SortKey = 'name' | 'provider' | 'ctx' | 'in' | 'out' | 'task';
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

const UNIT_LABEL: Record<Exclude<ModelRecord['price_unit'], 'mtok'>, string> = {
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

function formatUsd(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toPrecision(2)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

function taskCost(m: ModelRecord, preset: (typeof PRESETS)[PresetKey]): number | null {
  if ((m.price_unit ?? 'mtok') !== 'mtok') return null;
  return (preset.inTok * m.price_input_per_mtok + preset.outTok * m.price_output_per_mtok) / 1e6;
}

function unitPrice(m: ModelRecord): string | null {
  if (!m.price_unit || m.price_unit === 'mtok' || m.price_amount === undefined) return null;
  return `${formatUsd(m.price_amount)}${UNIT_LABEL[m.price_unit]}`;
}

export default function ModelTable({ models }: { models: ModelRecord[] }) {
  const [task, setTask] = useState<Task | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [presetKey, setPresetKey] = useState<PresetKey>('pdf');
  const [sortKey, setSortKey] = useState<SortKey>('task');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

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
    const isToken = (m: ModelRecord) => (m.price_unit ?? 'mtok') === 'mtok';
    const tokenRows = filtered.filter(isToken);
    const unitRows = filtered.filter((m) => !isToken(m));
    const cmp = (a: ModelRecord, b: ModelRecord) => {
      const va = value(a);
      const vb = value(b);
      const d =
        typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : Number(va) - Number(vb);
      return d * sortDir;
    };
    tokenRows.sort(cmp);
    unitRows.sort(cmp);
    return [...tokenRows, ...unitRows];
  }, [models, task, openOnly, preset, sortKey, sortDir]);

  const header = (key: SortKey, label: string, className = '') => (
    <th
      class={`p-0 font-mono text-xs font-normal tracking-widest uppercase ${className}`}
      aria-sort={sortKey === key ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        class={`w-full cursor-pointer p-3 text-left select-none ${
          sortKey === key ? 'text-shift-near' : 'text-ink-dim hover:text-ink'
        }`}
        onClick={() => {
          if (sortKey === key) setSortDir(sortDir === 1 ? -1 : 1);
          else {
            setSortKey(key);
            setSortDir(1);
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
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="mr-1 font-mono text-xs tracking-widest text-ink-dim uppercase">task</span>
        {TASKS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={task === t}
            onClick={() => setTask(task === t ? null : t)}
            class={`rounded-sm border px-2 py-1 font-mono text-xs transition-colors duration-100 ${
              task === t
                ? 'border-shift-near text-shift-near'
                : 'border-line text-ink-dim hover:border-ink-dim hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
        <span class="mx-2 h-4 w-px bg-line" aria-hidden="true" />
        <button
          type="button"
          aria-pressed={openOnly}
          onClick={() => setOpenOnly(!openOnly)}
          class={`rounded-sm border px-2 py-1 font-mono text-xs transition-colors duration-100 ${
            openOnly
              ? 'border-shift-near text-shift-near'
              : 'border-line text-ink-dim hover:border-ink-dim hover:text-ink'
          }`}
        >
          open weights only
        </button>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-1.5">
        <span class="mr-1 font-mono text-xs tracking-widest text-ink-dim uppercase">
          price per task
        </span>
        {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={presetKey === key}
            onClick={() => setPresetKey(key)}
            class={`rounded-sm border px-2 py-1 font-mono text-xs transition-colors duration-100 ${
              presetKey === key
                ? 'border-shift-near text-shift-near'
                : 'border-line text-ink-dim hover:border-ink-dim hover:text-ink'
            }`}
          >
            {PRESETS[key].label}
          </button>
        ))}
        <span class="nm-num text-xs text-ink-dim">{preset.hint}</span>
      </div>

      <div class="mt-6 overflow-x-auto rounded-md border border-line">
        <table class="w-full min-w-[720px] border-collapse bg-panel text-left">
          <thead>
            <tr class="border-b border-line">
              {header('name', 'model', 'sticky left-0 bg-panel')}
              {header('provider', 'provider')}
              {header('ctx', 'ctx')}
              {header('in', '$in /1M')}
              {header('out', '$out /1M')}
              {header('task', preset.label)}
              <th class="p-3 font-mono text-xs font-normal tracking-widest text-ink-dim uppercase">
                open
              </th>
              <th class="p-3 font-mono text-xs font-normal tracking-widest text-ink-dim uppercase">
                best for
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const unit = unitPrice(m);
              const cost = taskCost(m, preset);
              return (
                <tr
                  key={m.slug}
                  id={m.slug}
                  class="border-b border-line transition-colors duration-100 last:border-b-0 hover:bg-raised"
                >
                  <th
                    scope="row"
                    class="sticky left-0 bg-panel p-3 text-left font-body text-sm font-semibold text-ink"
                  >
                    {m.name}
                  </th>
                  <td class="p-3 text-sm text-ink-dim">{m.provider}</td>
                  <td class="nm-num p-3 text-xs">{formatCtx(m.context_window)}</td>
                  {unit ? (
                    <td class="nm-num p-3 text-xs" colSpan={2}>
                      {unit}
                    </td>
                  ) : (
                    <>
                      <td class="nm-num p-3 text-xs">
                        {formatUsd(m.price_input_per_mtok)}
                      </td>
                      <td class="nm-num p-3 text-xs">
                        {formatUsd(m.price_output_per_mtok)}
                      </td>
                    </>
                  )}
                  <td class="nm-num p-3 text-xs text-shift-near">
                    {cost === null ? '—' : formatUsd(cost)}
                  </td>
                  <td class="p-3 font-mono text-xs">
                    {m.open_weights ? (
                      <span class="text-ink">yes</span>
                    ) : (
                      <span class="text-ink-dim">no</span>
                    )}
                  </td>
                  <td class="max-w-64 p-3 text-xs text-ink-dim">{m.best_for.slice(0, 2).join('; ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="nm-num mt-3 text-xs text-ink-dim">
        {rows.length} / {models.length} models · unit-priced media models stay at the bottom
      </p>
    </section>
  );
}
