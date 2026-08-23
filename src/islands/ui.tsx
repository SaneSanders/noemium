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
    <span class="rounded-sm border-[1.5px] border-ink px-2 py-1 font-mono text-[11px] font-medium tracking-wider text-ink">
      {label}
    </span>
  );
}

export function YesNo({ value }: { value: boolean }) {
  return (
    <span class={`font-mono text-[13px] ${value ? 'font-bold text-ink' : 'text-ink-dim'}`}>
      {value ? 'yes' : 'no'}
    </span>
  );
}

const LOGO_SIZE = {
  sm: {
    box: 'h-7 w-7 rounded-sm p-0.5',
    type: 'text-base',
    dim: 28,
  },
  md: {
    box: 'h-10 w-10 rounded-sm p-0.5',
    type: 'text-xl',
    dim: 40,
  },
  lg: {
    box: 'h-14 w-14 rounded-md p-1.5',
    type: 'text-3xl',
    dim: 56,
  },
} as const;

export function LogoMark({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof LOGO_SIZE;
}) {
  const s = LOGO_SIZE[size];
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={s.dim}
        height={s.dim}
        loading="lazy"
        class={`shrink-0 border-[1.5px] border-ink bg-card object-contain ${s.box}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      class={`flex shrink-0 items-center justify-center border-[1.5px] border-ink bg-paper font-display font-black text-accent ${s.box} ${s.type}`}
    >
      {name.charAt(0)}
    </span>
  );
}
