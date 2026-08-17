import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/** Latest observations — tools, agents and stacks, freshest verification first. */
export async function GET(context: APIContext) {
  const [tools, agents, stacks] = await Promise.all([
    getCollection('tools'),
    getCollection('agents'),
    getCollection('stacks'),
  ]);

  const items = [
    ...tools.map((t) => ({
      title: `${t.data.name} — ${t.data.verdict}`,
      description: t.data.tagline,
      link: `/tools/${t.id}`,
      pubDate: new Date(t.data.last_verified),
    })),
    ...stacks.map((s) => ({
      title: `Stack: ${s.data.title}`,
      description: s.data.use_case,
      link: `/stacks/${s.id}`,
      pubDate: new Date(s.data.last_verified),
    })),
    ...agents.map((agent) => ({
      title: `${agent.data.evidence_tier === 'radar' ? 'Agent Radar' : 'Agent guide'}: ${agent.data.name}`,
      description: agent.data.tagline,
      link: `/agents/${agent.id}`,
      pubDate: new Date(agent.data.last_verified),
    })),
  ]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 30);

  return rss({
    title: 'Noemium — the AI landscape, observed',
    description:
      'An open, auditable directory of AI tools, operational agent guides, stacks and models. No pay-to-list.',
    site: context.site ?? 'https://noemium.com',
    items,
  });
}
