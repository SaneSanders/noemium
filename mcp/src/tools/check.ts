import { normalizeName, siteUrl } from '../data.ts';
import type { CatalogIndex, Verdict } from '../data.ts';

export type CheckStatus = 'ship' | 'situational' | 'skip' | 'radar' | 'dead' | 'ambiguous' | 'unknown';

export interface CheckResult {
  query: string;
  status: CheckStatus;
  slug?: string;
  name?: string;
  verdict?: Verdict;
  verdict_text?: string;
  last_verified?: string;
  url?: string;
  died?: string;
  cause?: string;
  succeeded_by?: string;
  /** Suggestions, never facts. `kind` lets an agent see which of them are dead. */
  candidates?: Array<{ slug: string; kind: 'tool' | 'grave' }>;
}

type IndexEntry = { kind: 'tool' | 'grave'; slug: string; via: 'name' | 'host' };

/** How many candidates `checkText` spells out before collapsing the rest into "+N more". */
const CANDIDATE_CAP = 8;

function dedupe(entries: IndexEntry[]): IndexEntry[] {
  return [...new Map(entries.map((e) => [`${e.kind}:${e.slug}`, e])).values()];
}

/**
 * Name/slug hits beat url-host hits. Applied on the substring branch too, not
 * only the exact one: a host is weak evidence of what the user meant.
 */
function preferNameOverHost(entries: IndexEntry[]): IndexEntry[] {
  const nameHits = entries.filter((e) => e.via === 'name');
  return nameHits.length ? nameHits : entries.filter((e) => e.via === 'host');
}

function toCandidates(entries: IndexEntry[]): Array<{ slug: string; kind: 'tool' | 'grave' }> {
  return dedupe(entries)
    .map((e) => ({ slug: e.slug, kind: e.kind }))
    .sort((a, b) => a.slug.localeCompare(b.slug) || a.kind.localeCompare(b.kind));
}

function deadResult(index: CatalogIndex, query: string, slug: string): CheckResult {
  const card = index.graveBySlug.get(slug)!;
  return {
    query,
    status: 'dead',
    slug: card.slug,
    name: card.name,
    died: card.died,
    cause: card.cause,
    succeeded_by: 'none' in card.succeeded_by ? undefined : card.succeeded_by.name,
    last_verified: card.last_verified,
    url: siteUrl('grave', card.slug),
  };
}

function toolResult(index: CatalogIndex, query: string, slug: string): CheckResult {
  const card = index.toolBySlug.get(slug)!;
  const result: CheckResult = {
    query,
    status: card.verdict ?? 'radar',
    slug: card.slug,
    name: card.name,
    last_verified: card.last_verified,
    url: siteUrl('tool', card.slug),
  };
  // A radar card carries no verdict. Passing its verdict_text along would read
  // as an endorsement the catalog has not made, so it is withheld.
  if (card.verdict) {
    result.verdict = card.verdict;
    result.verdict_text = card.verdict_text;
  }
  return result;
}

/**
 * Decide one exact tier. A "distinct product" is a slug: the same slug showing
 * up as both a grave and a tool card is one product whose card is stale, and
 * there the death wins — that is the whole of grave-over-tool. Two different
 * slugs are two products, and the only honest answer is `ambiguous`.
 *
 * `allowDeath` gates whether a lone grave may be reported as `dead`. A url
 * host is weak evidence — it names a domain, not a product ("microsoft.com"
 * is the host of a Cortana graveyard entry, not proof the company died) — so
 * a host-only match that lands on a graveyard entry must never assert a
 * death. It answers `unknown` instead, with that entry still offered as a
 * `kind: 'grave'` candidate. Only a name or slug match (`allowDeath: true`)
 * may produce `dead`.
 */
function decideExact(
  index: CatalogIndex,
  query: string,
  entries: IndexEntry[],
  allowDeath: boolean,
): CheckResult {
  const unique = dedupe(entries);
  if (new Set(unique.map((e) => e.slug)).size > 1) {
    return { query, status: 'ambiguous', candidates: toCandidates(unique) };
  }
  const grave = unique.find((e) => e.kind === 'grave');
  if (!grave) return toolResult(index, query, unique[0].slug);
  return allowDeath
    ? deadResult(index, query, grave.slug)
    : { query, status: 'unknown', candidates: toCandidates(unique) };
}

/**
 * Three tiers, tried in order, so that no weaker kind of match can ever be
 * presented as a fact:
 *   1. exact normalized key, `via: 'name'` entries only — a real name or slug
 *      match, so it may say `dead`;
 *   2. exact normalized key, `via: 'host'` entries only (only if tier 1 is
 *      empty) — a url host is weak evidence, so it may report a live card's
 *      verdict but may never declare a death; landing on a lone grave here
 *      answers `unknown` with that grave offered as a candidate instead;
 *   3. substring — suggestions only. It never yields a verdict and never yields
 *      a death, because "github" appearing inside a url is not a product name.
 */
function resolve(index: CatalogIndex, query: string): CheckResult {
  const normalized = normalizeName(query);
  if (!normalized) return { query, status: 'unknown' };

  const bucket = index.byNormalizedName.get(normalized) ?? [];

  const nameHits = bucket.filter((e) => e.via === 'name');
  if (nameHits.length) return decideExact(index, query, nameHits, true);

  const hostHits = bucket.filter((e) => e.via === 'host');
  if (hostHits.length) return decideExact(index, query, hostHits, false);

  const substringHits = preferNameOverHost(
    [...index.byNormalizedName.entries()]
      .filter(([key]) => key.includes(normalized))
      .flatMap(([, entries]) => entries),
  );
  const candidates = toCandidates(substringHits);
  return candidates.length ? { query, status: 'unknown', candidates } : { query, status: 'unknown' };
}

export function check(index: CatalogIndex, names: string[]): CheckResult[] {
  return names.map((name) => resolve(index, name));
}

function renderCandidates(candidates: Array<{ slug: string; kind: 'tool' | 'grave' }>): string {
  const shown = candidates
    .slice(0, CANDIDATE_CAP)
    .map((c) => (c.kind === 'grave' ? `${c.slug} (dead)` : c.slug));
  const rest = candidates.length - shown.length;
  return rest > 0 ? `${shown.join(', ')}, +${rest} more` : shown.join(', ');
}

export function checkText(results: CheckResult[]): string {
  return results
    .map((r) => {
      if (r.status === 'dead') {
        const successor = r.succeeded_by ? `successor: ${r.succeeded_by}` : 'no successor';
        return `${r.query} — DEAD ${r.died} (${r.cause}); ${successor} · ${r.url}`;
      }
      if (r.status === 'unknown') {
        const line = `${r.query} — UNKNOWN. No Noemium card; do not invent a verdict.`;
        return r.candidates?.length
          ? `${line} Near matches (names only, not verdicts): ${renderCandidates(r.candidates)}`
          : line;
      }
      if (r.status === 'ambiguous') {
        return `${r.query} — AMBIGUOUS. Did you mean: ${renderCandidates(r.candidates ?? [])}?`;
      }
      if (r.status === 'radar') {
        return `${r.query} — RADAR (on the map, no verdict yet, verified ${r.last_verified}) · ${r.url}`;
      }
      let line = `${r.query} — ${r.status.toUpperCase()} (verified ${r.last_verified})`;
      if (r.verdict_text) line += ` — ${r.verdict_text}`;
      if (r.url) line += ` · ${r.url}`;
      return line;
    })
    .join('\n');
}
