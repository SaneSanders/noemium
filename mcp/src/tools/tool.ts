import { siteUrl } from '../data.ts';
import type { CatalogIndex, ToolCard, Verdict } from '../data.ts';

export interface ToolDetail extends ToolCard {
  noemium_url: string;
  alternatives_detail: Array<{ slug: string; name: string; verdict?: Verdict; url: string }>;
  dead?: { died: string; cause: string; succeeded_by?: string };
}

export interface ToolLookupError {
  error: string;
  suggestions: string[];
}

/** How many near-slug suggestions to offer on an unknown slug. */
const SUGGESTION_CAP = 5;

/**
 * Full catalog card for one tool: the raw card plus its own url, its
 * alternatives resolved through the real tool cards (never a broken link to
 * a slug with no card), and — when the slug also has a graveyard entry — a
 * death block. `succeeded_by` on that graveyard entry is a required
 * discriminated union (named successor vs. explicit `none`), narrowed with
 * the same `'none' in ...` idiom as `tools/check.ts` so the no-successor arm
 * is never read as if it named one.
 */
export function toolDetail(index: CatalogIndex, slug: string): ToolDetail | ToolLookupError {
  const card = index.toolBySlug.get(slug);
  if (!card) {
    const suggestions = [...index.toolBySlug.keys()]
      .filter((key) => key.includes(slug) || slug.includes(key))
      .slice(0, SUGGESTION_CAP);
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
