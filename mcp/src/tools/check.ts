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
  candidates?: string[];
}

type IndexEntry = { kind: 'tool' | 'grave'; slug: string; via: 'name' | 'host' };

/**
 * Pick which entries in a normalized-key bucket to trust. Name/slug matches
 * beat url-host matches: when the bucket holds both, keep only the `via:
 * 'name'` entries; fall back to the host entries when there is no name
 * entry. This also means a real name-vs-name collision (two different
 * products both landing on the same normalized name, e.g. "motion" /
 * "motion-dev") survives as multiple entries here — `via` cannot and should
 * not break that tie, so it surfaces as ambiguous downstream.
 */
function preferNameOverHost(entries: IndexEntry[]): IndexEntry[] {
  const nameHits = entries.filter((e) => e.via === 'name');
  return nameHits.length ? nameHits : entries;
}

function dedupe(entries: IndexEntry[]): IndexEntry[] {
  return [...new Map(entries.map((e) => [`${e.kind}:${e.slug}`, e])).values()];
}

/** Graves win over tool cards: a dead product must never come back as a verdict. */
function resolve(index: CatalogIndex, query: string): CheckResult {
  const normalized = normalizeName(query);
  if (!normalized) return { query, status: 'unknown' };

  const exactBucket = index.byNormalizedName.get(normalized);
  const hits = exactBucket && exactBucket.length
    ? preferNameOverHost(exactBucket)
    : [...index.byNormalizedName.entries()]
        .filter(([key]) => key.includes(normalized))
        .flatMap(([, entries]) => entries);

  const unique = dedupe(hits);
  if (unique.length === 0) return { query, status: 'unknown' };

  const grave = unique.find((h) => h.kind === 'grave');
  if (grave) {
    const card = index.graveBySlug.get(grave.slug)!;
    const successor = 'none' in card.succeeded_by ? undefined : card.succeeded_by.name;
    return {
      query,
      status: 'dead',
      slug: card.slug,
      name: card.name,
      died: card.died,
      cause: card.cause,
      succeeded_by: successor,
      last_verified: card.last_verified,
      url: siteUrl('grave', card.slug),
    };
  }

  if (unique.length > 1) {
    return { query, status: 'ambiguous', candidates: unique.map((h) => h.slug).sort() };
  }

  const card = index.toolBySlug.get(unique[0].slug)!;
  return {
    query,
    status: card.verdict ?? 'radar',
    slug: card.slug,
    name: card.name,
    verdict: card.verdict,
    verdict_text: card.verdict_text,
    last_verified: card.last_verified,
    url: siteUrl('tool', card.slug),
  };
}

export function check(index: CatalogIndex, names: string[]): CheckResult[] {
  return names.map((name) => resolve(index, name));
}

export function checkText(results: CheckResult[]): string {
  return results
    .map((r) => {
      if (r.status === 'dead') {
        const successor = r.succeeded_by ? `successor: ${r.succeeded_by}` : 'no successor';
        return `${r.query} — DEAD ${r.died} (${r.cause}); ${successor} · ${r.url}`;
      }
      if (r.status === 'unknown') return `${r.query} — UNKNOWN. No Noemium card; do not invent a verdict.`;
      if (r.status === 'ambiguous') return `${r.query} — AMBIGUOUS. Did you mean: ${r.candidates?.join(', ')}?`;
      if (r.status === 'radar') {
        return `${r.query} — RADAR (on the map, no verdict yet, verified ${r.last_verified}) · ${r.url}`;
      }
      return `${r.query} — ${r.status.toUpperCase()} (verified ${r.last_verified}) — ${r.verdict_text ?? ''} · ${r.url}`;
    })
    .join('\n');
}
