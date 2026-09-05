import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

/** llms.txt — curated machine-facing summary: field-tested shelf + jobs + link to full dump. */
export const GET: APIRoute = async (context) => {
  const site = context.site ?? new URL('https://noemium.com');
  const [tools, jobs] = await Promise.all([
    getCollection('tools'),
    getCollection('jobs'),
  ]);
  const testedTools = tools
    .filter((tool) => tool.data.evidence_tier === 'field-tested')
    .sort((a, b) => a.id.localeCompare(b.id));

  const lines = [
    '# Noemium',
    '',
    '> Noemium is an open source catalog of AI tools, operational agent guides, stacks and models.',
    '> No paid listings, ever. Every verdict is a pull request anyone can audit,',
    '> with receipts linked and limitations named next to the praise.',
    '',
    'MCP server (read-only catalog access for agents): https://mcp.noemium.com/mcp',
    '',
    'This is a curated view: the verified shelf (tools we ran hands-on) plus the job guides.',
    `For the complete catalog dump, see [llms-full.txt](${new URL('/llms-full.txt', site).href}).`,
    '',
    '## Verified shelf',
    '',
    ...testedTools.map(
      (tool) =>
        `- [${tool.data.name}](${new URL(`/tools/${tool.id}/`, site).href}): ${tool.data.tagline} — ${tool.data.verdict ?? 'radar'}`,
    ),
    '',
    '## Jobs',
    '',
    ...jobs.map(
      (job) =>
        `- [${job.data.title}](${new URL(`/jobs/${job.id}/`, site).href}): ${job.data.use_case}`,
    ),
    '',
    '## Complete dump',
    '',
    `- [llms-full.txt](${new URL('/llms-full.txt', site).href}): full catalog dump — tools, models and stacks`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
