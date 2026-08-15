// Shared presentational bits for the Preact islands.
// Class literals are complete so Tailwind's scanner picks them up.

export type Verdict = 'ship' | 'situational' | 'skip';
export type Momentum = 'blueshift' | 'steady' | 'redshift';

const verdictTone: Record<Verdict, string> = {
  ship: 'nm-sticker-ship',
  situational: 'nm-sticker-situational',
  skip: 'nm-sticker-skip',
};

export function VerdictStamp({ verdict }: { verdict: Verdict }) {
  return <span class={`nm-sticker ${verdictTone[verdict]}`}>{verdict}</span>;
}

const momentumConfig: Record<Momentum, { label: string; tone: string; path: string }> = {
  blueshift: {
    label: 'Blueshift — gaining momentum',
    tone: 'text-shift-near',
    path: 'M4 12 L12 4 M6 4 H12 V10',
  },
  steady: {
    label: 'Steady momentum',
    tone: 'text-shift-steady',
    path: 'M3 8 H13 M10 5 L13 8 L10 11',
  },
  redshift: {
    label: 'Redshift — losing momentum',
    tone: 'text-shift-far',
    path: 'M4 4 L12 12 M12 6 V12 H6',
  },
};

export function MomentumArrow({
  momentum,
  class: className = '',
}: {
  momentum: Momentum;
  class?: string;
}) {
  const c = momentumConfig[momentum];
  return (
    <svg
      viewBox="0 0 16 16"
      class={`inline-block h-4 w-4 ${c.tone} ${className}`}
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label={c.label}
    >
      <title>{c.label}</title>
      <path d={c.path} />
    </svg>
  );
}

export function FlagBadge({ label }: { label: string }) {
  return (
    <span class="rounded-sm border-[1.5px] border-ink px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-ink">
      {label}
    </span>
  );
}

export function YesNo({ value }: { value: boolean }) {
  return (
    <span class={`font-mono text-xs ${value ? 'font-bold text-ink' : 'text-ink-dim'}`}>
      {value ? 'yes' : 'no'}
    </span>
  );
}
