import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

/** llms-full.txt — complete machine-readable dump of the Noemium catalog. */
export const GET: APIRoute = async () => {
  const [tools, models, stacks] = await Promise.all([
    getCollection('tools'),
    getCollection('models'),
    getCollection('stacks'),
  ]);

  const sortedTools = [...tools].sort((a, b) => {
    const cat = a.data.category.localeCompare(b.data.category);
    if (cat !== 0) return cat;
    return a.id.localeCompare(b.id);
  });

  const sortedModels = [...models].sort((a, b) => a.id.localeCompare(b.id));
  const sortedStacks = [...stacks].sort((a, b) => a.id.localeCompare(b.id));

  const formatPrice = (m: (typeof models)[number]['data']) => {
    if (m.price_unit && m.price_unit !== 'mtok' && m.price_amount !== undefined) {
      return `$${m.price_amount}/${m.price_unit.replace('_', '-')}`;
    }
    if (m.price_input_per_mtok === 0 && m.price_output_per_mtok === 0) {
      return 'pricing unavailable';
    }
    return `$${m.price_input_per_mtok}/1M in · $${m.price_output_per_mtok}/1M out`;
  };

  const lines = [
    '# Noemium — full catalog dump',
    '',
    '> Noemium is an open source catalog of AI tools, operational agent guides, stacks and models.',
    '> No paid listings, ever. Every verdict is a pull request anyone can audit,',
    '> with receipts linked and limitations named next to the praise.',
    '',
    `This file contains the complete ${sortedTools.length}-tool catalog, the ${sortedModels.length}-model price/context table, and the ${sortedStacks.length}-stack recipe list in plain text.`,
    `Canonical site: https://noemium.com/`,
    `Source: https://github.com/SaneSanders/noemium`,
    `License: CC BY 4.0 (code MIT).`,
    '',
    '> This dump mixes protocol-tested cards with desk-audit cards. Cards with a test_run carry a published protocol; treat the rest as desk research, not field evidence.',
    '',
    '## Tools',
    '',
    ...sortedTools.flatMap((t) => [
      `### ${t.data.name}`,
      `- slug: ${t.id}`,
      `- page: https://noemium.com/tools/${t.id}/`,
      `- per-tool JSON: https://noemium.com/tools/${t.id}.json`,
      `- category: ${t.data.category}`,
      `- verdict: ${t.data.verdict}`,
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
      `- page: https://noemium.com/stacks/${s.id}/`,
      '',
    ]),
  ];

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
