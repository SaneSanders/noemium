import { nearSlugs, siteUrl } from '../data.ts';
import type { CatalogIndex, GraveCard, ToolCard, Verdict } from '../data.ts';

export interface ToolDetail extends ToolCard {
  noemium_url: string;
  alternatives_detail: Array<{ slug: string; name: string; verdict?: Verdict; url: string }>;
  dead?: { died: string; cause: string; succeeded_by?: string };
}

/**
 * A graveyard slug answered as a first-class result. `check` hands an agent
 * the slug of a dead product; the natural next call is `tool({slug})`, and
 * answering that with `isError: true, Unknown slug "flowise"` reads as "not in
 * the catalog" — which sends the agent straight back to training data that
 * still thinks Flowise is alive. So a grave is data, not an error.
 *
 * `successor` is the narrowed named-successor arm of `GraveCard.succeeded_by`
 * (undefined on the explicit `{ none: true }` arm); `successor_note` is the
 * note both arms carry, so the "why there is no successor" text is never lost.
 */
export interface DeadDetail {
  slug: string;
  name: string;
  url: string;
  category: string;
  died: string;
  cause: string;
  obituary: string;
  receipt: string;
  last_verified: string;
  successor?: { name: string; slug?: string; url?: string; note: string };
  successor_note: string;
  noemium_url: string;
}

export interface ToolLookupError {
  error: string;
  suggestions: string[];
}

export type ToolLookup = ToolDetail | DeadDetail | ToolLookupError;

/** How many near-slug suggestions to offer on an unknown slug. */
const SUGGESTION_CAP = 5;

function deadDetail(grave: GraveCard): DeadDetail {
  const successor = 'none' in grave.succeeded_by ? undefined : grave.succeeded_by;
  return {
    slug: grave.slug,
    name: grave.name,
    url: grave.url,
    category: grave.category,
    died: grave.died,
    cause: grave.cause,
    obituary: grave.obituary,
    receipt: grave.receipt,
    last_verified: grave.last_verified,
    successor,
    successor_note: grave.succeeded_by.note,
    noemium_url: siteUrl('grave', grave.slug),
  };
}

/**
 * Full catalog card for one tool slug: the raw card plus its own url, its
 * alternatives resolved through the real tool cards (never a broken link to
 * a slug with no card), and — when the slug also has a graveyard entry — a
 * death block. `succeeded_by` on that graveyard entry is a required
 * discriminated union (named successor vs. explicit `none`), narrowed with
 * the same `'none' in ...` idiom as `tools/check.ts` so the no-successor arm
 * is never read as if it named one.
 *
 * A slug with no tool card but a graveyard entry returns that death as a
 * `DeadDetail`. `isError` stays for slugs the catalog genuinely does not know.
 */
export function toolDetail(index: CatalogIndex, slug: string): ToolLookup {
  const card = index.toolBySlug.get(slug);
  if (!card) {
    const grave = index.graveBySlug.get(slug);
    if (grave) return deadDetail(grave);
    const suggestions = nearSlugs(
      [...index.toolBySlug.keys(), ...index.graveBySlug.keys()],
      slug,
      SUGGESTION_CAP,
    );
    return { error: `Unknown slug "${slug}". Use search to find the card.`, suggestions };
  }

  const alternatives_detail = card.alternatives
    .map((altSlug) => index.toolBySlug.get(altSlug))
    .filter((alt): alt is ToolCard => Boolean(alt))
    .map((alt) => ({ slug: alt.slug, name: alt.name, verdict: alt.verdict, url: siteUrl('tool', alt.slug) }));

  const grave = index.graveBySlug.get(slug);
  const dead = grave
    ? {
        died: grave.died,
        cause: grave.cause,
        succeeded_by: 'none' in grave.succeeded_by ? undefined : grave.succeeded_by.name,
      }
    : undefined;

  return {
    ...card,
    noemium_url: siteUrl('tool', card.slug),
    alternatives_detail,
    dead,
  };
}

export function toolText(detail: ToolDetail): string {
  const verdictLabel = (detail.verdict ?? 'radar').toUpperCase();
  const deadLine = detail.dead
    ? `WARNING: this product died ${detail.dead.died} — ${detail.dead.cause}; ` +
      (detail.dead.succeeded_by ? `successor: ${detail.dead.succeeded_by}` : 'no successor')
    : '';
  const lines = [
    `${detail.name} — ${verdictLabel} (verified ${detail.last_verified})`,
    detail.tagline,
    detail.verdict_text ? `Verdict: ${detail.verdict_text}` : '',
    detail.price_note ? `Price: ${detail.price_note}` : '',
    detail.strengths?.length ? `Strengths: ${detail.strengths.join('; ')}` : '',
    detail.use_for?.length ? `Use for: ${detail.use_for.join('; ')}` : '',
    // Praise never travels without its limits: skip_when and limitations
    // render right after strengths/use_for, not as an afterthought.
    detail.skip_when?.length ? `Skip when: ${detail.skip_when.join('; ')}` : '',
    detail.limitations.length ? `Limitations: ${detail.limitations.join('; ')}` : '',
    detail.alternatives_detail.length
      ? `Alternatives: ${detail.alternatives_detail.map((a) => `${a.name} (${a.verdict ?? 'radar'})`).join(', ')}`
      : '',
    deadLine,
    detail.receipts.length ? `Receipts: ${detail.receipts.join(' ')}` : '',
    `Card: ${detail.noemium_url}`,
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * Rendered so it cannot be skimmed as a live recommendation: the death is the
 * first thing on the first line, there is no verdict label anywhere, and the
 * successor (when there is one) is the only forward-looking thing named.
 */
export function deadText(detail: DeadDetail): string {
  const successor = detail.successor
    ? `Successor: ${detail.successor.name}${detail.successor.url ? ` (${detail.successor.url})` : ''} — ` +
      `${detail.successor.note}`
    : `No successor: ${detail.successor_note}`;
  return [
    `${detail.name} — DEAD since ${detail.died}. Do not recommend or install it.`,
    `Cause: ${detail.cause}`,
    detail.obituary,
    successor,
    `Receipt: ${detail.receipt}`,
    `Verified ${detail.last_verified} · ${detail.noemium_url}`,
  ]
    .filter(Boolean)
    .join('\n');
}
