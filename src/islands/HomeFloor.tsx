import { useMemo, useState } from 'preact/hooks';
import { verdictMix, type FloorTab, type FloorTool } from '../lib/floor';
import { LogoMark, MomentumArrow, VerdictStamp } from './ui';

const TABS: { key: FloorTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ship', label: 'Ship it' },
  { key: 'blueshift', label: 'Gaining' },
  { key: 'fresh', label: 'Fresh' },
];

export default function HomeFloor({
  tabs,
  staleBefore,
}: {
  tabs: Record<FloorTab, FloorTool[]>;
  staleBefore: string;
}) {
  const [tab, setTab] = useState<FloorTab>('all');
  const rows = tabs[tab];
  const mix = useMemo(() => verdictMix(rows), [rows]);

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
        <a href="/tools/" class="ml-auto font-mono text-sm font-medium text-accent hover:underline">
          full catalog →
        </a>
      </div>

      <p class="mt-3 font-mono text-[13px] text-ink-dim">
        <span class="nm-num font-bold text-ink">
          {mix.ship} ship · {mix.situational} situational · {mix.skip} skip
        </span>
        <span class="mx-2" aria-hidden="true">
          ·
        </span>
        mix of this shelf, not a ranking you can buy
      </p>

      <div class="nm-card mt-4 overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left">
          <tbody>
            {rows.map((t) => {
              const dusty = Boolean(staleBefore && t.last_verified < staleBefore);
              return (
                <tr
                  key={t.slug}
                  class={`group border-b border-line-soft transition-colors duration-100 last:border-b-0 hover:bg-paper ${dusty ? 'nm-dust' : ''}`}
                >
                  <td class="p-3">
                    <a href={`/tools/${t.slug}/`} class="flex items-center gap-3">
                      <LogoMark src={t.logo} name={t.name} size="sm" />
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
                    {dusty && (
                      <span class="mt-0.5 block text-[10px] tracking-wider uppercase opacity-70">
                        dusty
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
