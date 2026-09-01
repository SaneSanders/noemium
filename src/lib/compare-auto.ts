/**
 * Deterministic auto-generation of same-category tool pairs for static
 * `/tools/compare/<a>-vs-<b>/` landing pages.
 *
 * The algorithm is intentionally simple and reproducible:
 * - work only with verdicted tools (ship / situational / skip; radar excluded)
 * - within each category, anchors are featured tools, or the top 2 tools by
 *   verdict rank + freshness when no featured tool exists
 * - each anchor pairs with up to 4 non-anchor same-category rivals,
 *   preferring the same verdict tier, then rank, then freshness, then slug
 * - curated pairs are skipped in either order, and self-pairs are skipped
 *
 * The output is capped globally at `maxAutoPairs` (default 120) to keep build
 * times predictable; the trim happens in the deterministic global order.
 */

export interface CompareAutoTool {
  id: string;
  name: string;
  category: string;
  verdict: 'ship' | 'situational' | 'skip' | undefined;
  featured: boolean;
  last_verified: string;
}

export interface ComparePair {
  a: string;
  b: string;
}

const VERDICT_RANK: Record<string, number> = {
  ship: 3,
  situational: 2,
  skip: 1,
};

function rankOf(verdict: string | undefined): number {
  return verdict ? (VERDICT_RANK[verdict] ?? 0) : 0;
}

function compareByRankThenFreshnessThenSlug(
  a: CompareAutoTool,
  b: CompareAutoTool,
): number {
  const rankDiff = rankOf(b.verdict) - rankOf(a.verdict);
  if (rankDiff !== 0) return rankDiff;
  const dateDiff = b.last_verified.localeCompare(a.last_verified);
  if (dateDiff !== 0) return dateDiff;
  return a.id.localeCompare(b.id);
}

export function buildAutoPairs(
  tools: CompareAutoTool[],
  curatedPairs: ComparePair[],
  maxAutoPairs = 120,
): ComparePair[] {
  const verdicted = tools.filter((t) =>
    t.verdict === 'ship' || t.verdict === 'situational' || t.verdict === 'skip',
  );

  const curatedSet = new Set(
    curatedPairs.flatMap(({ a, b }) => [`${a}-vs-${b}`, `${b}-vs-${a}`]),
  );

  const byCategory = new Map<string, CompareAutoTool[]>();
  for (const tool of verdicted) {
    const list = byCategory.get(tool.category) ?? [];
    list.push(tool);
    byCategory.set(tool.category, list);
  }

  const auto: ComparePair[] = [];

  const categories = Array.from(byCategory.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  for (const category of categories) {
    const catTools = byCategory.get(category)!;

    let anchors = catTools.filter((t) => t.featured);
    if (anchors.length === 0) {
      anchors = catTools
        .slice()
        .sort(compareByRankThenFreshnessThenSlug)
        .slice(0, 2);
    }

    // Deterministic global order uses anchor slug ascending.
    anchors.sort((a, b) => a.id.localeCompare(b.id));

    const anchorIds = new Set(anchors.map((t) => t.id));

    for (const anchor of anchors) {
      const rivals = catTools
        .filter((t) => t.id !== anchor.id && !anchorIds.has(t.id))
        .sort((a, b) => {
          const aSameTier = a.verdict === anchor.verdict ? 0 : 1;
          const bSameTier = b.verdict === anchor.verdict ? 0 : 1;
          if (aSameTier !== bSameTier) return aSameTier - bSameTier;
          return compareByRankThenFreshnessThenSlug(a, b);
        })
        .slice(0, 4);

      for (const rival of rivals) {
        if (curatedSet.has(`${anchor.id}-vs-${rival.id}`)) continue;
        auto.push({ a: anchor.id, b: rival.id });
      }
    }
  }

  // Global cap; trim happens in the deterministic global order already used
  // above (category asc, anchor slug asc, rival rank).
  if (auto.length > maxAutoPairs) {
    auto.length = maxAutoPairs;
  }

  return auto;
}
