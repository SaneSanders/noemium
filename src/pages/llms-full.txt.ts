import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

/** llms-full.txt — complete machine-readable dump of the Noemium catalog. */
export const GET: APIRoute = async (context) => {
  const site = context.site ?? new URL('https://noemium.com');
  const [tools, models, stacks, skills] = await Promise.all([
    getCollection('tools'),
    getCollection('models'),
    getCollection('stacks'),
    getCollection('skills'),
  ]);

  const sortedTools = [...tools].sort((a, b) => {
    const cat = a.data.category.localeCompare(b.data.category);
    if (cat !== 0) return cat;
    return a.id.localeCompare(b.id);
  });

  const sortedModels = [...models].sort((a, b) => a.id.localeCompare(b.id));
  const sortedStacks = [...stacks].sort((a, b) => a.id.localeCompare(b.id));
  const sortedSkills = [...skills].sort((a, b) => a.id.localeCompare(b.id));

  // Non-USD amounts print with a currency code, never a dollar sign — see
  // content-schemas.ts's modelSchema `price_currency` comment; the price is
  // never converted.
  const amount = (value: number, currency: string) =>
    currency === 'usd' ? `$${value}` : `${value} ${currency.toUpperCase()}`;
  const formatPrice = (m: (typeof models)[number]['data']) => {
    const currency = m.price_currency ?? 'usd';
    if (m.price_input_per_mtok === 0 && m.price_output_per_mtok === 0) {
      // 0/0 is a schema sentinel, not a price, whenever price_amount is set —
      // whether the card is priced per image/video-second/etc, or (like
      // seedance-2-5) nominally `price_unit: mtok` with one headline number
      // instead of an input/output split. Only a genuinely unpublished rate
      // (no price_amount at all) is "pricing unavailable".
      if (m.price_amount === undefined) return 'pricing unavailable';
      const unit = (m.price_unit ?? 'mtok').replace('_', '-');
      return `${amount(m.price_amount, currency)}/${unit}`;
    }
    return `${amount(m.price_input_per_mtok, currency)}/1M in · ${amount(m.price_output_per_mtok, currency)}/1M out`;
  };

  const lines = [
    '# Noemium — full catalog dump',
    '',
    '> Noemium is an open source catalog of AI tools, operational agent guides, stacks and models.',
    '> No paid listings, ever. Every verdict is a pull request anyone can audit,',
    '> with receipts linked and limitations named next to the praise.',
    '',
    `This file contains the complete ${sortedTools.length}-tool catalog, the ${sortedModels.length}-model price/context table, the ${sortedStacks.length}-stack recipe list, and ${sortedSkills.length} skills in plain text.`,
    `Canonical site: ${site.origin}`,
    `Source: https://github.com/SaneSanders/noemium`,
    `License: CC BY 4.0 (code MIT).`,
    '',
    '> Every card here is a desk audit with receipts — treat it as desk research, not field evidence. Verdicts are reviewed PRs; dispute them via the repo.',
    '',
    '## Tools',
    '',
    ...sortedTools.flatMap((t) => [
      `### ${t.data.name}`,
      `- slug: ${t.id}`,
      `- page: ${new URL(`/tools/${t.id}/`, site).href}`,
      `- per-tool JSON: ${new URL(`/tools/${t.id}.json`, site).href}`,
      `- category: ${t.data.category}`,
      `- evidence_tier: ${t.data.evidence_tier}`,
      `- verdict: ${t.data.verdict ?? 'radar'}`,
      `- pricing: ${t.data.pricing}${t.data.price_note ? ` — ${t.data.price_note}` : ''}`,
      `- free tier: ${t.data.free_tier ? 'yes' : 'no'}`,
      `- api: ${t.data.api ? 'yes' : 'no'}`,
      `- open source: ${t.data.open_source ? 'yes' : 'no'}`,
      `- self-host: ${t.data.self_host ? 'yes' : 'no'}`,
      `- momentum: ${t.data.momentum}`,
      `- key limitation: ${t.data.limitations[0] ?? 'none listed'}`,
      `- tagline: ${t.data.tagline}`,
      `- receipts: ${t.data.receipts.join(', ')}`,
      '',
    ]),
    '## Models',
    '',
    '| model | provider | context | prices | open weights | best for |',
    '| --- | --- | --- | --- | --- | --- |',
    ...sortedModels.map((m) => {
      const ctx = m.data.context_window ? `${m.data.context_window.toLocaleString('en-US')} tokens` : '—';
      return `| ${m.data.name} | ${m.data.provider} | ${ctx} | ${formatPrice(m.data)} | ${m.data.open_weights ? 'yes' : 'no'} | ${m.data.best_for.join('; ')} |`;
    }),
    '',
    '## Stacks',
    '',
    ...sortedStacks.flatMap((s) => [
      `### ${s.data.title}`,
      `- slug: ${s.id}`,
      `- use case: ${s.data.use_case}`,
      `- monthly cost: $${s.data.monthly_cost_usd}`,
      `- difficulty: ${s.data.difficulty}`,
      `- tools: ${s.data.tools.join(', ')}`,
      `- page: ${new URL(`/stacks/${s.id}/`, site).href}`,
      '',
    ]),
    '## Skills',
    '',
    ...sortedSkills.flatMap((s) => [
      `### ${s.data.name}`,
      `- slug: ${s.id}`,
      `- page: ${new URL(`/skills/${s.id}/`, site).href}`,
      `- evidence_tier: ${s.data.evidence_tier}`,
      `- verdict: ${s.data.verdict ?? 'radar'}`,
      `- compatible: ${s.data.compatible.join(', ')}`,
      `- tagline: ${s.data.tagline}`,
      `- receipts: ${s.data.receipts.join(', ')}`,
      '',
    ]),
  ];

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
