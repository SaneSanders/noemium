import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import changelog from '../data/changelog.json';
import {
  formatWeekRssDescription,
  formatWeekRssTitle,
  type CatalogWeek,
} from '../lib/week-thread';

/** Weekly catalog diff from git history — not last_verified, not a market feed. */
export async function GET(context: APIContext) {
  const site = context.site ?? new URL('https://noemium.com');
  const weeks = (changelog.weeks ?? []) as CatalogWeek[];

  return rss({
    title: 'Noemium — weekly catalog diff',
    description:
      'Git history of the Noemium repo: tools, stacks, models and agents added, removed or repriced. Not a market index. Weekly, not daily.',
    site,
    items: weeks.map((week) => ({
      title: formatWeekRssTitle(week),
      description: formatWeekRssDescription(week),
      link: '/changelog',
      pubDate: new Date(`${week.to}T00:00:00Z`),
    })),
  });
}
