import { dateMinusDays, DUST_DAYS } from './floor.ts';
import { isHomepageReceipt } from './shelf.ts';

/** Same window as scripts/stale-check.mjs adopt-a-page issues. */
export const ADOPT_STALE_DAYS = 60;

export type ToolHealth = {
  id: string;
  name: string;
  verdict: string;
  last_verified: string;
  featured?: boolean;
  receipts: string[];
  strengths?: string[];
  use_for?: string[];
  skip_when?: string[];
};

export function hasBriefing(tool: {
  strengths?: unknown;
  use_for?: unknown;
  skip_when?: unknown;
}): boolean {
  return (
    Array.isArray(tool.strengths) &&
    Array.isArray(tool.use_for) &&
    Array.isArray(tool.skip_when)
  );
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.floor((to - from) / 86_400_000);
}

export function catalogHealth(tools: ToolHealth[], asOf: string) {
  const newest = tools.map((tool) => tool.last_verified).sort().at(-1) ?? asOf;
  const dustyBefore = dateMinusDays(newest, DUST_DAYS);
  const ship = tools.filter((tool) => tool.verdict === 'ship');
  const briefed = tools.filter(hasBriefing);
  const shipUnbriefed = ship.filter((tool) => !hasBriefing(tool));
  const dusty = tools
    .filter((tool) => tool.last_verified < dustyBefore)
    .sort((a, b) => a.last_verified.localeCompare(b.last_verified) || a.name.localeCompare(b.name));
  const stale = tools
    .filter((tool) => daysBetween(tool.last_verified, asOf) > ADOPT_STALE_DAYS)
    .sort((a, b) => a.last_verified.localeCompare(b.last_verified) || a.name.localeCompare(b.name));
  const homepageOnly = tools.filter(
    (tool) => tool.receipts.length > 0 && tool.receipts.every(isHomepageReceipt),
  );
  const mix = { ship: 0, situational: 0, skip: 0 };
  for (const tool of tools) {
    if (tool.verdict === 'ship' || tool.verdict === 'situational' || tool.verdict === 'skip') {
      mix[tool.verdict] += 1;
    }
  }

  return {
    total: tools.length,
    mix,
    newest,
    dustyBefore,
    briefed: briefed.length,
    ship: ship.length,
    shipBriefed: ship.length - shipUnbriefed.length,
    shipUnbriefed,
    dusty,
    stale,
    homepageOnly,
    featuredUnbriefed: tools.filter((tool) => tool.featured && !hasBriefing(tool)),
  };
}
