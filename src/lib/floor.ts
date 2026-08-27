import type { Momentum, Verdict } from '../islands/ui';

export interface FloorTool {
  slug: string;
  name: string;
  category: string;
  pricing: 'free' | 'freemium' | 'paid';
  verdict?: Verdict;
  momentum: Momentum;
  featured: boolean;
  last_verified: string;
  logo?: string | null;
}

export type FloorTab = 'all' | 'ship' | 'blueshift' | 'fresh';

export const FLOOR_ROWS = 12;
export const FRESH_DAYS = 14;
export const DUST_DAYS = 45;

export function newestVerified(tools: { last_verified: string }[]): string {
  return tools.map((t) => t.last_verified).sort().at(-1) ?? '';
}

export function dateMinusDays(iso: string, days: number): string {
  if (!iso) return '';
  return new Date(new Date(iso).getTime() - days * 86400_000).toISOString().slice(0, 10);
}

function momentumRank(m: Momentum): number {
  return m === 'blueshift' ? 0 : m === 'steady' ? 1 : 2;
}

function byRecency(a: FloorTool, b: FloorTool): number {
  return (
    momentumRank(a.momentum) - momentumRank(b.momentum) ||
    b.last_verified.localeCompare(a.last_verified) ||
    a.name.localeCompare(b.name)
  );
}

export function floorSlice(tools: FloorTool[], tab: FloorTab, freshAfter: string): FloorTool[] {
  if (tab === 'all') {
    const anchors = tools.filter((t) => t.featured).sort(byRecency);
    const finds = tools.filter((t) => !t.featured).sort(byRecency);
    const mixed: FloorTool[] = [];
    for (let i = 0; i < FLOOR_ROWS / 2; i++) {
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
    .slice(0, FLOOR_ROWS);
}

export function verdictMix(rows: { verdict?: Verdict }[]): {
  ship: number;
  situational: number;
  skip: number;
} {
  const mix = { ship: 0, situational: 0, skip: 0 };
  for (const row of rows) {
    if (row.verdict === 'ship' || row.verdict === 'situational' || row.verdict === 'skip') {
      mix[row.verdict] += 1;
    }
  }
  return mix;
}
