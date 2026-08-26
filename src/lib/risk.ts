/**
 * Risk classifier for the weekly changelog.
 *
 * Turns git-level field changes into decision-relevant risk events:
 * price moves, verdict flips, model retirements and graveyard deaths.
 * Copy edits and last_verified bumps are intentionally ignored.
 */

export type RiskClass = 'price_change' | 'verdict_change' | 'retirement' | 'death';

export type RiskEvent = {
  class: RiskClass;
  collection: string;
  slug: string;
  name: string;
  detail: string;
};

export type WeekEntry = {
  name: string;
  slug: string;
  collection?: string;
  category?: string;
  retiring?: { date: string; successor: string };
};

export type WeekChange = WeekEntry & {
  field: string;
  from: string | number | null;
  to: string | number | null;
};

export type RiskWeek = {
  id: string;
  from: string;
  to: string;
  counts: { added: number; removed: number; changed: number };
  added: WeekEntry[];
  removed: WeekEntry[];
  changed: WeekChange[];
  risk?: RiskEvent[];
};

const CLASS_LABELS: Record<RiskClass, { singular: string; plural: string }> = {
  price_change: { singular: 'price move', plural: 'price moves' },
  verdict_change: { singular: 'verdict change', plural: 'verdict changes' },
  retirement: { singular: 'retirement', plural: 'retirements' },
  death: { singular: 'death', plural: 'deaths' },
};

function pluralize(n: number, label: { singular: string; plural: string }) {
  return `${n} ${n === 1 ? label.singular : label.plural}`;
}

/**
 * Map a changelog field label to a risk class. Null means the field is not
 * decision-relevant (e.g. tagline edits, receipt churn).
 */
export function classifyRiskField(collection: string, field: string): RiskClass | null {
  if (collection === 'tools') {
    if (field === 'pricing' || field === 'price note' || field === 'free tier') return 'price_change';
    if (field === 'verdict') return 'verdict_change';
  }
  if (collection === 'models') {
    if (['input $/Mtok', 'output $/Mtok', 'price', 'price unit'].includes(field)) {
      return 'price_change';
    }
    if (field === 'retiring') return 'retirement';
  }
  return null;
}

/** Build the risk event list for a single week. */
export function buildWeekRisk(week: RiskWeek): RiskEvent[] {
  const risk: RiskEvent[] = [];
  const seen = new Set<string>();

  const push = (ev: RiskEvent) => {
    const key = `${ev.class}:${ev.slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    risk.push(ev);
  };

  for (const c of week.changed) {
    const cls = classifyRiskField(c.collection ?? '', c.field);
    if (!cls) continue;
    let detail: string;
    if (cls === 'retirement') {
      const to = typeof c.to === 'object' && c.to ? (c.to as { date?: string; successor?: string }) : null;
      const from = typeof c.from === 'object' && c.from ? (c.from as { date?: string; successor?: string }) : null;
      const active = to ?? from ?? c.retiring ?? null;
      detail = active ? `retiring ${active.date ?? '—'} → ${active.successor ?? '—'}` : 'retiring status changed';
    } else {
      detail = `${c.field}: ${c.from ?? '—'} → ${c.to ?? '—'}`;
    }
    push({
      class: cls,
      collection: c.collection ?? '',
      slug: c.slug,
      name: c.name,
      detail,
    });
  }

  for (const a of week.added) {
    if (a.collection === 'graveyard') {
      push({ class: 'death', collection: a.collection, slug: a.slug, name: a.name, detail: '' });
    }
    if (a.collection === 'models' && a.retiring) {
      push({
        class: 'retirement',
        collection: a.collection,
        slug: a.slug,
        name: a.name,
        detail: `retiring ${a.retiring.date} → ${a.retiring.successor}`,
      });
    }
  }

  return risk;
}

/** Count risk events by class, preserving a stable class order. */
function classCounts(risk: RiskEvent[]): { class: RiskClass; count: number }[] {
  const order: RiskClass[] = ['price_change', 'verdict_change', 'retirement', 'death'];
  const counts = new Map<RiskClass, number>();
  for (const ev of risk) counts.set(ev.class, (counts.get(ev.class) ?? 0) + 1);
  return order
    .map((cls) => ({ class: cls, count: counts.get(cls) ?? 0 }))
    .filter((c) => c.count > 0);
}

/** RSS title: only non-zero risk classes, with correct pluralization. */
export function formatRiskTitle(week: RiskWeek): string {
  const counts = classCounts(week.risk ?? []);
  const summary = counts.map((c) => pluralize(c.count, CLASS_LABELS[c.class])).join(', ');
  return `Week ${week.id}: ${summary || 'no risk events'}`;
}

/** RSS body: one line per risk event, grouped by class label. */
export function formatRiskDescription(week: RiskWeek): string {
  const lines = (week.risk ?? []).map((ev) => {
    const label = CLASS_LABELS[ev.class].singular;
    return ev.detail ? `${label}: ${ev.name} · ${ev.detail}` : `${label}: ${ev.name}`;
  });
  return lines.join('\n');
}
