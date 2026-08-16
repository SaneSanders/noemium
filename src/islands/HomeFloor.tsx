import { useMemo, useState } from 'preact/hooks';
import type { ToolRecord } from './FilterBar';
import { MomentumArrow, VerdictStamp } from './ui';

type Tab = 'all' | 'ship' | 'blueshift' | 'fresh';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ship', label: 'Ship it' },
  { key: 'blueshift', label: 'Gaining' },
  { key: 'fresh', label: 'Fresh' },
];

const ROWS = 12;
// "Fresh" = verified within this window of the newest verification in the set.
const FRESH_DAYS = 14;

export default function HomeFloor({ tools }: { tools: ToolRecord[] }) {
  const [tab, setTab] = useState<Tab>('all');

  const rows = useMemo(() => {
    const maxVerified = tools.map((t) => t.last_verified).sort().at(-1) ?? '';
    const freshAfter = new Date(new Date(maxVerified).getTime() - FRESH_DAYS * 86400_000)
      .toISOString()
      .slice(0, 10);

    const momentumRank = (m: ToolRecord['momentum']) =>
      m === 'blueshift' ? 0 : m === 'steady' ? 1 : 2;
    const byRecency = (
      a: ToolRecord,
      b: ToolRecord,
    ) =>
      momentumRank(a.momentum) - momentumRank(b.momentum) ||
      b.last_verified.localeCompare(a.last_verified) ||
      a.name.localeCompare(b.name);

    // "All" is a deliberate 50/50 mix: half recognizable anchors (featured),
    // half niche finds — interleaved so the shelf reads mixed, not blocked.
    if (tab === 'all') {
      const anchors = tools.filter((t) => t.featured).sort(byRecency);
      const finds = tools.filter((t) => !t.featured).sort(byRecency);
      const mixed: ToolRecord[] = [];
      for (let i = 0; i < ROWS / 2; i++) {
        if (anchors[i]) mixed.push(anchors[i]);
        if (finds[i]) mixed.push(finds[i]);
      }
      return mixed;
    }

    return tools
      .filter((t) => {
        if (tab === 'ship') return t.verdict === 'ship';
        if (tab === 'blueshift') return t.momentum === 'blueshift';
        if (tab === 'fresh') return t.last_verified >= freshAfter;
        return true;
      })
      .sort(byRecency)
      .slice(0, ROWS);
  }, [tools, tab]);

  return (
    <div>
      <div class="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
            class={`cursor-pointer rounded-md border-[1.5px] px-4 py-2 font-mono text-sm font-medium transition-all duration-100 ${
              tab === t.key
                ? 'border-accent bg-accent text-on-accent'
                : 'border-ink bg-card text-ink hover:-translate-0.5 hover:border-accent hover:text-accent hover:shadow-hard-sm'
            }`}
          >
            {t.label}
          </button>
        ))}
        <a
          href="/tools"
          class="ml-auto font-mono text-sm font-medium text-accent hover:underline"
        >
          full catalog →
        </a>
      </div>

      <div class="nm-card mt-4 overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left">
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.slug}
                class="group border-b border-line-soft transition-colors duration-100 last:border-b-0 hover:bg-paper"
              >
                <td class="p-3">
                  <a href={`/tools/${t.slug}`} class="flex items-center gap-3">
                    {t.logo ? (
                      <img
                        src={t.logo}
                        alt=""
                        width="28"
                        height="28"
                        loading="lazy"
                        class="h-7 w-7 shrink-0 rounded-sm border-[1.5px] border-ink bg-card object-contain p-0.5"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-ink bg-paper font-display text-base font-black text-accent"
                      >
                        {t.name.charAt(0)}
                      </span>
                    )}
                    <span class="font-body text-[15px] font-bold text-ink group-hover:text-accent">
                      {t.name}
                    </span>
                  </a>
                </td>
                <td class="p-3 font-mono text-[13px] text-ink-dim uppercase">{t.category}</td>
                <td class="p-3">
                  <VerdictStamp verdict={t.verdict} />
                </td>
                <td class="nm-num p-3 text-[13px] font-bold text-accent">{t.pricing}</td>
                <td class="p-3">
                  <MomentumArrow momentum={t.momentum} />
                </td>
                <td class="nm-num p-3 text-right font-mono text-[13px] text-ink-dim">
                  {t.last_verified}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
