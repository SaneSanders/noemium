/**
 * Death calendar — only ISO dates already in the catalogue, next to a
 * sunset verb. No invented dates. Editorial renames stop successor cards
 * being labelled as the thing that dies (lab 2026-08-25).
 */
import { daysBetween } from './catalog-health.ts';

export const HORIZON_DAYS = 90;

const ISO = /20\d\d-\d{2}-\d{2}/g;
const DEATHISH =
  /\b(sunset|sunsets|sunsetting|shutting down|shuts down|shut down|closes|winding down|dies|dying|retired|retiring|discontinued|discontinuation|loses downloads|stops new|API calls (end|stop)|legacy service|announced to close)\b/i;

export type DeathKind = 'model' | 'api' | 'feature' | 'product' | 'grave';

export type DeathEvent = {
  slug: string;
  name: string;
  date: string;
  kind: DeathKind;
  href: string;
  quote: string;
  days: number;
  migrate?: { name: string; href: string } | null;
};

type ModelInput = {
  slug: string;
  name: string;
  retiring?: { date: string; successor: string } | undefined;
};

type ToolInput = {
  slug: string;
  name: string;
  limitations?: string[];
  skip_when?: string[];
  verdict_text?: string;
  price_note?: string;
};

type GraveInput = {
  slug: string;
  name: string;
  died: string;
  cause: string;
  succeeded_by?: { none?: boolean; note?: string; name?: string; slug?: string };
};

const RENAME: Record<
  string,
  { name: string; kind?: DeathKind; migrate?: { name: string; slug: string } | null }
> = {
  'openai-responses|2026-08-26': {
    name: 'OpenAI Assistants API',
    kind: 'api',
    migrate: { name: 'Responses API', slug: 'openai-responses' },
  },
  'hunyuan-api|2026-09-30': {
    name: 'Hunyuan 混元大模型 (legacy platform)',
    kind: 'api',
    migrate: { name: 'Tencent TokenHub (same card)', slug: 'hunyuan-api' },
  },
  'suno|2026-09-03': { name: 'Suno free-tier downloads', kind: 'feature' },
  'yi-api|2026-08-03': { name: '01.AI Yi API signups closed', kind: 'feature' },
  'yi-api|2026-09-03': {
    name: '01.AI Yi API (self-serve)',
    kind: 'api',
    migrate: { name: 'Open-weight Yi on Hugging Face', slug: 'hugging-face' },
  },
  'sora|2026-09-24': { name: 'Sora API (legacy)', kind: 'api', migrate: null },
};

function datesIn(text: string): string[] {
  return [...text.matchAll(ISO)].map((m) => m[0]);
}

function toolHref(slug: string) {
  return `/tools/${slug}/`;
}

export function collectDeaths(input: {
  asOf: string;
  models: ModelInput[];
  tools: ToolInput[];
  graveyard: GraveInput[];
}): { upcoming: DeathEvent[]; past: DeathEvent[] } {
  const { asOf, models, tools, graveyard } = input;
  const seen = new Set<string>();
  const events: DeathEvent[] = [];

  const push = (event: Omit<DeathEvent, 'days'> & { days?: number }) => {
    const key = `${event.date}|${event.slug}|${event.kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    const rename = RENAME[`${event.slug}|${event.date}`];
    const days = daysBetween(asOf, event.date);
    events.push({
      ...event,
      days,
      name: rename?.name ?? event.name,
      kind: rename?.kind ?? event.kind,
      migrate: rename?.migrate
        ? { name: rename.migrate.name, href: toolHref(rename.migrate.slug) }
        : event.migrate,
    });
  };

  for (const model of models) {
    if (!model.retiring?.date) continue;
    const succ = models.find((m) => m.slug === model.retiring!.successor);
    push({
      slug: model.slug,
      name: model.name,
      date: model.retiring.date,
      kind: 'model',
      href: '/models/',
      quote: `Retiring ${model.retiring.date} → ${succ?.name ?? model.retiring.successor}.`,
      migrate: succ ? { name: succ.name, href: '/models/' } : null,
    });
  }

  for (const grave of graveyard) {
    push({
      slug: grave.slug,
      name: grave.name,
      date: grave.died,
      kind: 'grave',
      href: '/graveyard/',
      quote: grave.cause,
    });
    const note = grave.succeeded_by?.note;
    if (note) {
      for (const date of datesIn(note)) {
        if (date <= grave.died) continue;
        push({
          slug: grave.slug,
          name: grave.succeeded_by?.none ? `${grave.name} API` : (grave.succeeded_by?.name ?? grave.name),
          date,
          kind: grave.succeeded_by?.none ? 'api' : 'product',
          href: '/graveyard/',
          quote: note,
        });
      }
    }
  }

  for (const tool of tools) {
    const blobs = [
      ...(tool.limitations ?? []),
      ...(tool.skip_when ?? []),
      tool.verdict_text ?? '',
      tool.price_note ?? '',
    ].filter(Boolean);
    for (const blob of blobs) {
      if (!DEATHISH.test(blob)) continue;
      for (const date of datesIn(blob)) {
        const kind: DeathKind = /download/i.test(blob)
          ? 'feature'
          : /API|platform|endpoint/i.test(blob)
            ? 'api'
            : 'product';
        push({
          slug: tool.slug,
          name: tool.name,
          date,
          kind,
          href: toolHref(tool.slug),
          quote: blob,
        });
      }
    }
  }

  const upcoming = events
    .filter((e) => e.days >= 0 && e.days <= HORIZON_DAYS)
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  const past = events
    .filter((e) => e.days < 0)
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  return { upcoming, past };
}
