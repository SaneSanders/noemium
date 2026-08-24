import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import changelog from '../data/changelog.json';
import { formatRiskDescription, formatRiskTitle, type RiskWeek } from '../lib/risk';

/** Weekly risk feed: only weeks with decision-relevant events. */
export async function GET(context: APIContext) {
  const site = context.site ?? new URL('https://noemium.com');
  const weeks = (changelog.weeks ?? []) as RiskWeek[];
  const riskWeeks = weeks.filter((week) => (week.risk ?? []).length > 0);

  return rss({
    title: 'Noemium — weekly risk feed',
    description:
      'Decision-relevant changes from the Noemium repo: price moves, verdict flips, model retirements and deaths. Not a market index. Weekly, not daily.',
    site,
    items: riskWeeks.map((week) => ({
      title: formatRiskTitle(week),
      description: formatRiskDescription(week),
      link: '/changelog/',
      pubDate: new Date(`${week.to}T00:00:00Z`),
    })),
  });
}
