import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

/** llms.txt — machine-facing project summary in the llmstxt.org format. */
export const GET: APIRoute = async () => {
  const [tools, stacks, models, agents] = await Promise.all([
    getCollection('tools'),
    getCollection('stacks'),
    getCollection('models'),
    getCollection('agents'),
  ]);
  const strictAgents = agents.filter((agent) => agent.data.evidence_tier !== 'radar');

  const lines = [
    '# Noemium',
    '',
    '> Noemium is an open source catalog of AI tools, operational agent guides, stacks and models.',
    '> No paid listings, ever. Every verdict is a pull request anyone can audit,',
    '> with receipts linked and limitations named next to the praise.',
    '',
    `The catalog currently tracks ${tools.length} tools, ${stacks.length} stacks, ${models.length} models,`,
    `and ${agents.length} agent field-guide entries. ${strictAgents.length} agent guides meet the current source-verification bar;`,
    `the rest are clearly labeled Radar entries without editorial verdicts or hard cost claims.`,
    '',
    '## Catalog',
    '',
    '- [Tools](https://noemium.com/tools): the full tool catalog with verdicts, pricing and limitations',
    '- [Agents](https://noemium.com/agents): operational field guides with installation, requirements, cost scenarios, security boundaries and evidence tiers',
    '- [Compare tools](https://noemium.com/tools/compare): side-by-side tables, e.g. /tools/compare?tools=cursor,aider',
    '- [Stacks](https://noemium.com/stacks): copy-pasteable tool stacks with monthly cost and difficulty',
    '- [Models](https://noemium.com/models): model data — context windows, token prices, benchmarks',
    '- [Quiz](https://noemium.com/quiz): pick a stack by answering a few questions',
    '- [About](https://noemium.com/about): who runs this and the one rule',
    '- [Method](https://noemium.com/method): verdicts, receipts, why there are no stars',
    '',
    '## Source-verified agent guides',
    '',
    ...strictAgents.map(
      (agent) => `- [${agent.data.name}](https://noemium.com/agents/${agent.id}): ${agent.data.tagline}`,
    ),
    '',
    '## Stacks',
    '',
    ...stacks.map(
      (s) => `- [${s.data.title}](https://noemium.com/stacks/${s.id}): ${s.data.use_case}`,
    ),
    '',
    '## Project',
    '',
    '- [Contribute](https://noemium.com/contribute): how to add or correct an entry via pull request',
    '- [RSS feed](https://noemium.com/rss.xml): weekly catalog diff (git history of the repo, not the market)',
    '- [tools.json](https://noemium.com/api/tools.json): raw tool catalog',
    '- [stacks.json](https://noemium.com/api/stacks.json): stack recipes and budget twins',
    '- [models.json](https://noemium.com/api/models.json): model prices',
    '- [Source code](https://github.com/SaneSanders/noemium): the catalog is the repository',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
