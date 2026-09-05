import { normalizeName, siteUrl } from '../data.ts';
import type { CardKind, CatalogIndex, IndexEntry, Verdict } from '../data.ts';
import { formatContextWindow, formatModelPrice } from '../model-format.ts';

export type CheckStatus =
  | 'ship' | 'situational' | 'skip' | 'radar' | 'dead' | 'model' | 'ambiguous' | 'unknown';

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
  /** Model cards only — they carry a price and specs, never a verdict. */
  provider?: string;
  price_note?: string;
  context_window?: number;
  open_weights?: boolean;
  /** Suggestions, never facts. `kind` lets an agent see which of them are dead. */
  candidates?: Array<{ slug: string; kind: CardKind }>;
}

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

function toCandidates(entries: IndexEntry[]): Array<{ slug: string; kind: CardKind }> {
  return dedupe(entries)
    .map((e) => ({ slug: e.slug, kind: e.kind }))
    .sort((a, b) => a.slug.localeCompare(b.slug) || a.kind.localeCompare(b.kind));
}

function cardNameAndSlug(index: CatalogIndex, entry: IndexEntry): { name: string; slug: string } {
  if (entry.kind === 'grave') {
    const card = index.graveBySlug.get(entry.slug)!;
    return { name: card.name, slug: card.slug };
  }
  if (entry.kind === 'model') {
    const card = index.modelBySlug.get(entry.slug)!;
    return { name: card.name, slug: card.slug };
  }
  const card = index.toolBySlug.get(entry.slug)!;
  return { name: card.name, slug: card.slug };
}

/**
 * Is a url host actually evidence about THIS product?
 *
 * A host key answers for a card only when the HOST contains the card's own
 * name or slug — the host is the product's own domain, possibly with
 * branding fluff: `cursor.com` -> cursor, `klingai` -> kling, `aider.chat` ->
 * aider. The reverse direction (the product's name contains the host) used
 * to pass too, which let a bare vendor domain answer for one of that
 * vendor's specific products: `nvidia` -> NVIDIA Riva, `mistral` -> Mistral
 * Vibe, `supabase` -> Supabase MCP, `atlassian` -> Atlassian MCP, `cohere` ->
 * Cohere Embed, `replit` -> Replit Agent, `canva` -> Canva Code, `github` ->
 * GitHub Copilot/GitHub MCP. A vendor's domain is not evidence of which of
 * its products the caller meant, so that direction is dropped.
 *
 * `normalizeName` strips a `.ai` TLD from a HOST (`fireworks.ai` ->
 * "fireworks") but cannot do the same for a card's own name/slug, where "AI"
 * sits after a space or hyphen rather than a dot (`Fireworks AI` / `fireworks-
 * ai` -> "fireworksai") — so the host-contains-name test above missed a
 * product's own `.ai` domain outright: "fireworks" never contains
 * "fireworksai". An EXACT match (not substring) against the candidate with
 * its trailing "ai" dropped is also accepted, so these still match — exact,
 * because substring containment after stripping can misfire on an unrelated
 * collision (`ai.pydantic.dev` normalizes to "aipydantic", which happens to
 * contain "pydantic" purely because the leading "ai" subdomain has nowhere
 * else to go, not because the host is PydanticAI's own domain). This
 * recovered 10 real own-domain aliases the rule above had dropped, including
 * fireworks.ai, hume.ai, together.ai, leonardo.ai, rev.ai, novita.ai,
 * friendli.ai and resemble.ai; checked against the same vendor-domain cases
 * the rule above exists to reject (nvidia, mistral, supabase, atlassian,
 * canva, replit, cohere, sourcegraph, github), none of them re-admit, and
 * the ai.pydantic.dev collision above is confirmed rejected too.
 *
 * Measured against the real snapshot (all 345 url-bearing catalog items):
 * the either-direction rule this function replaced passed 258 of them;
 * host-contains-name alone (before this "ai" fix) passed 222; with the "ai"
 * fix, 232 — every one of the 10 newly recovered a domain that is genuinely
 * the product's own, and every kept case still a domain that is genuinely
 * the product's own (cursor.com, klingai.com, aider.chat, 21st.dev,
 * activepieces.com among them).
 */
function dropTrailingAi(normalized: string): string {
  // Guard against reducing to '' (which would make every key "equal" it):
  // the shortest real card name/slug ending in "ai" in the catalog today
  // normalizes to 5 characters, so requiring > 2 leaves comfortable margin.
  return normalized.length > 2 && normalized.endsWith('ai') ? normalized.slice(0, -2) : normalized;
}

function hostNamesTheCard(key: string, card: { name: string; slug: string }): boolean {
  return [normalizeName(card.name), normalizeName(card.slug)].some((candidate) => {
    if (candidate === '') return false;
    // Exact equality, not `.includes`, for the ai-stripped comparison: a
    // real `name.ai` domain strips to exactly the brand (`fireworks.ai` ->
    // "fireworks" == "fireworks"), but substring containment after stripping
    // can accidentally fire on an unrelated collision — e.g. an "ai."
    // SUBdomain (`ai.pydantic.dev` normalizes to "aipydantic", which
    // contains "pydantic" as a substring purely because the leading "ai"
    // has nowhere else to go, not because it is evidence about anything).
    // The un-stripped branch below still allows substring containment for
    // branding fluff that has nothing to do with this "ai" case (`klingai`
    // -> Kling).
    return key.includes(candidate) || key === dropTrailingAi(candidate);
  });
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
 * A model card is a price/spec sheet, not a judgement: the catalog never
 * ranks models with ship/situational/skip. So `check` gives them their own
 * status and reports only what the card actually knows — never a borrowed
 * verdict from a neighbouring tool card.
 */
function modelResult(index: CatalogIndex, query: string, slug: string): CheckResult {
  const card = index.modelBySlug.get(slug)!;
  return {
    query,
    status: 'model',
    slug: card.slug,
    name: card.name,
    provider: card.provider,
    price_note: formatModelPrice(card),
    context_window: card.context_window,
    open_weights: card.open_weights,
    last_verified: card.last_verified,
    url: siteUrl('model', card.slug),
  };
}

/**
 * Decide one exact tier. A "distinct product" is a slug: the same slug showing
 * up as both a grave and a tool card is one product whose card is stale, and
 * there the death wins — that is the whole of grave-over-tool. Two different
 * slugs are two products, and the only honest answer is `ambiguous`.
 *
 * `tier` gates how much authority the match carries. A url host is weak
 * evidence — it names a domain, not a product — so on the `'host'` tier a
 * match must first pass `hostNamesTheCard`, and even then may never assert a
 * death ("microsoft.com" is the host of a Cortana graveyard entry, not proof
 * the company died). Anything a host match cannot assert comes back as
 * `unknown` with the card still offered as a candidate. Only the `'name'`
 * tier — a real name or slug match — may produce `dead`.
 */
function decideExact(
  index: CatalogIndex,
  query: string,
  key: string,
  entries: IndexEntry[],
  tier: 'name' | 'host',
): CheckResult {
  const unique = dedupe(entries);
  if (new Set(unique.map((e) => e.slug)).size > 1) {
    return { query, status: 'ambiguous', candidates: toCandidates(unique) };
  }
  const asUnknown: CheckResult = { query, status: 'unknown', candidates: toCandidates(unique) };
  // One slug, possibly carrying several card kinds. A grave outranks a tool
  // card of the same slug (the product died, its card is stale); a tool card
  // outranks a model card of the same slug (the verdict is the stronger fact).
  const entry = unique.find((e) => e.kind === 'grave') ?? unique.find((e) => e.kind === 'tool') ?? unique[0];
  if (tier === 'host' && !hostNamesTheCard(key, cardNameAndSlug(index, entry))) return asUnknown;
  if (entry.kind === 'grave') return tier === 'name' ? deadResult(index, query, entry.slug) : asUnknown;
  if (entry.kind === 'model') return modelResult(index, query, entry.slug);
  return toolResult(index, query, entry.slug);
}

/**
 * Three tiers, tried in order, so that no weaker kind of match can ever be
 * presented as a fact:
 *   1. exact normalized key, `via: 'name'` entries only — a real name or slug
 *      match, so it may say `dead`;
 *   2. exact normalized key, `via: 'host'` entries only (only if tier 1 is
 *      empty) — a url host is weak evidence, so it may report a live card's
 *      verdict ONLY when the host and the card name each other, and may never
 *      declare a death; everything else answers `unknown` with the card
 *      offered as a candidate instead;
 *   3. substring — suggestions only. It never yields a verdict and never yields
 *      a death, because "github" appearing inside a url is not a product name.
 */
function resolve(index: CatalogIndex, query: string): CheckResult {
  const normalized = normalizeName(query);
  if (!normalized) return { query, status: 'unknown' };

  const bucket = index.byNormalizedName.get(normalized) ?? [];

  const nameHits = bucket.filter((e) => e.via === 'name');
  if (nameHits.length) return decideExact(index, query, normalized, nameHits, 'name');

  const hostHits = bucket.filter((e) => e.via === 'host');
  if (hostHits.length) return decideExact(index, query, normalized, hostHits, 'host');

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

function renderCandidates(candidates: Array<{ slug: string; kind: CardKind }>): string {
  const LABELS: Record<CardKind, string> = { tool: '', grave: ' (dead)', model: ' (model)' };
  const shown = candidates.slice(0, CANDIDATE_CAP).map((c) => `${c.slug}${LABELS[c.kind]}`);
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
      if (r.status === 'model') {
        const weights = r.open_weights ? 'open weights' : 'closed weights';
        return (
          `${r.query} — MODEL card (priced and dated, no Noemium verdict): ${r.name} by ${r.provider} — ` +
          `${r.price_note}, ${formatContextWindow(r.context_window)}, ${weights} ` +
          `(verified ${r.last_verified}) · ${r.url}`
        );
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
