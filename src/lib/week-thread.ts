/**
 * Weekly catalog diff → pasteable X thread / RSS body.
 * This is git history of the repo, not a market index, and not a daily feed.
 */

export type WeekEntry = {
  name: string;
  collection?: string;
  category?: string;
};

export type WeekChange = WeekEntry & {
  field: string;
  from: string | number | null;
  to: string | number | null;
};

export type CatalogWeek = {
  id: string;
  from: string;
  to: string;
  counts: { added: number; removed: number; changed: number };
  added: WeekEntry[];
  removed: WeekEntry[];
  changed: WeekChange[];
};

const NAME_LIMIT = 12;
const LARGE_ADD = 40;

export const WEEK_DIFF_DISCLAIMER =
  'Git history of this repo — not the AI market. Weekly snapshot, not a daily feed.';

function listNames(entries: { name: string }[], total: number): string {
  const names = entries.slice(0, NAME_LIMIT).map((e) => e.name);
  const extra = total - names.length;
  if (extra > 0) names.push(`+${extra} more`);
  return names.join(', ');
}

function changeLine(c: WeekChange): string {
  return `${c.name} · ${c.field} · ${c.from ?? '—'} → ${c.to ?? '—'}`;
}

function listChanges(changes: WeekChange[], total: number): string {
  const lines = changes.slice(0, NAME_LIMIT).map(changeLine);
  const extra = total - lines.length;
  if (extra > 0) lines.push(`+${extra} more`);
  return lines.join('; ');
}

function addedNote(week: CatalogWeek): string {
  if (week.counts.added >= LARGE_ADD) {
    return `A large added count usually means files first committed that week, not that the market launched them. `;
  }
  return '';
}

/** Numbered tweets, ready to paste as an X thread. */
export function formatWeekThread(week: CatalogWeek, site = 'https://noemium.com'): string {
  const tweets: string[] = [
    [
      `Noemium ${week.id} catalog diff`,
      WEEK_DIFF_DISCLAIMER,
      `+${week.counts.added} added · −${week.counts.removed} removed · ~${week.counts.changed} repriced`,
    ].join('\n'),
  ];

  if (week.counts.added > 0) {
    tweets.push(
      `Added\n${addedNote(week)}${listNames(week.added, week.counts.added)}`,
    );
  }
  if (week.counts.removed > 0) {
    tweets.push(`Removed\n${listNames(week.removed, week.counts.removed)}`);
  }
  if (week.counts.changed > 0) {
    tweets.push(
      `Repriced / changed\n${listChanges(week.changed, week.counts.changed)}`,
    );
  }
  tweets.push(`Full week: ${site}/changelog`);

  const n = tweets.length;
  return tweets.map((body, i) => `${i + 1}/${n}\n${body}`).join('\n\n');
}

export function formatWeekRssTitle(week: CatalogWeek): string {
  return `${week.id} catalog diff: +${week.counts.added} / −${week.counts.removed} / ~${week.counts.changed}`;
}

/** Single RSS description: same facts as the thread, without tweet numbers. */
export function formatWeekRssDescription(week: CatalogWeek): string {
  const parts = [
    WEEK_DIFF_DISCLAIMER,
    `+${week.counts.added} added · −${week.counts.removed} removed · ~${week.counts.changed} repriced`,
  ];
  if (week.counts.added > 0) {
    parts.push(`Added: ${addedNote(week)}${listNames(week.added, week.counts.added)}`);
  }
  if (week.counts.removed > 0) {
    parts.push(`Removed: ${listNames(week.removed, week.counts.removed)}`);
  }
  if (week.counts.changed > 0) {
    parts.push(`Repriced / changed: ${listChanges(week.changed, week.counts.changed)}`);
  }
  return parts.join('\n\n');
}
