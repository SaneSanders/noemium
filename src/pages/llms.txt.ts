import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

/** llms.txt — machine-facing project summary in the llmstxt.org format. */
export const GET: APIRoute = async () => {
  const [tools, stacks, models] = await Promise.all([
    getCollection('tools'),
    getCollection('stacks'),
    getCollection('models'),
  ]);

  const lines = [
    '# Noemium',
    '',
    '> Noemium is an open source observatory of AI tools, stacks and models.',
    '> No paid listings, ever. Every verdict is a pull request anyone can audit,',
    '> with receipts linked and limitations named next to the praise.',
    '',
    `The catalog currently tracks ${tools.length} tools, ${stacks.length} stacks`,
    `and ${models.length} models, each with a signed verdict and a verification date.`,
    '',
    '## Catalog',
    '',
    '- [Tools](https://noemium.com/tools): the full tool catalog with verdicts, pricing and limitations',
    '- [Compare tools](https://noemium.com/tools/compare): side-by-side tables, e.g. /tools/compare?tools=cursor,aider',
    '- [Stacks](https://noemium.com/stacks): copy-pasteable tool stacks with monthly cost and difficulty',
    '- [Models](https://noemium.com/models): model data — context windows, token prices, benchmarks',
    '- [Quiz](https://noemium.com/quiz): pick a stack by answering a few questions',
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
    '- [RSS feed](https://noemium.com/rss.xml): latest observations',
    '- [Source code](https://github.com/SaneSanders/noemium): the catalog is the repository',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
