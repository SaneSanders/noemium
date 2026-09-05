import { search } from '../search.ts';
import { siteUrl } from '../data.ts';
import type { CatalogIndex, StackCard, Verdict } from '../data.ts';

export interface StackDetail extends StackCard {
  url: string;
  tools_detail: Array<{ slug: string; name: string; verdict?: Verdict; url: string }>;
}

export interface StackLookupArgs {
  task?: string;
  slug?: string;
  max_monthly_usd?: number;
}

function decorate(index: CatalogIndex, stack: StackCard): StackDetail {
  return {
    ...stack,
    url: siteUrl('stack', stack.slug),
    tools_detail: stack.tools.map((slug) => {
      const card = index.toolBySlug.get(slug);
      // A tool slug with no card still gets a real, non-broken noemium.com
      // link — it just falls back to the slug for its display name.
      return { slug, name: card?.name ?? slug, verdict: card?.verdict, url: siteUrl('tool', slug) };
    }),
  };
}

/**
 * The cost a caller with this stack's cheapest cut would actually pay: the
 * studio price, or the budget-twin price when the stack has one, whichever
 * is lower.
 */
function cheapestMonthlyCost(stack: StackCard): number {
  return Math.min(stack.monthly_cost_usd, stack.budget?.monthly_cost_usd ?? Infinity);
}

/**
 * A budget ceiling is satisfied if either the studio price or the cheaper
 * budget-twin price (when the stack has one) fits under it — the caller
 * wants "can I afford some cut of this stack", not "is the priciest cut
 * cheap enough".
 */
function budgetOk(stack: StackCard, maxMonthlyUsd: number | undefined): boolean {
  return maxMonthlyUsd === undefined || cheapestMonthlyCost(stack) <= maxMonthlyUsd;
}

/**
 * By `slug`, a direct lookup. By `task`, runs the Task 5 search scorer and
 * keeps only `kind: 'stack'` hits — that scorer applies its MIN_SCORE floor
 * to raw relevance, so a weak/unrelated task phrase legitimately returns an
 * empty list rather than a guessed stack.
 *
 * With neither `task` nor `slug` — including a budget-only call, or a call
 * with no criteria at all — there is no question to answer "no" to: the
 * caller is asking to browse the catalog, not naming a task the catalog
 * failed to match. This lists every stack (filtered by `max_monthly_usd`
 * when given), cheapest cut first, instead of the confident-sounding "no
 * stack for this" that a criteria-free call used to get for free.
 */
export function stackLookup(index: CatalogIndex, args: StackLookupArgs): StackDetail[] {
  if (args.slug) {
    const stack = index.stackBySlug.get(args.slug);
    return stack && budgetOk(stack, args.max_monthly_usd) ? [decorate(index, stack)] : [];
  }
  if (args.task) {
    return search(index, args.task)
      .filter((hit) => hit.kind === 'stack')
      .map((hit) => index.stackBySlug.get(hit.slug))
      .filter((stack): stack is StackCard => stack !== undefined && budgetOk(stack, args.max_monthly_usd))
      .map((stack) => decorate(index, stack));
  }
  return index.snapshot.stacks
    .filter((stack) => budgetOk(stack, args.max_monthly_usd))
    .slice()
    .sort((a, b) => cheapestMonthlyCost(a) - cheapestMonthlyCost(b))
    .map((stack) => decorate(index, stack));
}

export function stackText(stacks: StackDetail[]): string {
  if (stacks.length === 0) return 'No stack for this. Noemium does not guess.';
  return stacks
    .map((stack) => {
      const budgetNote = stack.budget ? ` (budget variant $${stack.budget.monthly_cost_usd}/mo)` : '';
      const tools = stack.tools_detail.map((t) => `${t.name} (${t.verdict ?? 'radar'})`).join(', ');
      return (
        `${stack.title} — $${stack.monthly_cost_usd}/mo${budgetNote}\n` +
        `${stack.use_case}\n` +
        `Tools: ${tools}\n` +
        `Verified ${stack.last_verified} · ${stack.url}`
      );
    })
    .join('\n\n');
}
