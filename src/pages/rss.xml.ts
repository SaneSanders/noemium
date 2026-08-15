import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/** Latest observations — tools and stacks, freshest verification first. */
export async function GET(context: APIContext) {
  const [tools, stacks] = await Promise.all([getCollection('tools'), getCollection('stacks')]);

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
  ]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 30);

  return rss({
    title: 'Noemium — the AI landscape, observed',
    description:
      'An open, auditable directory of AI tools, stacks and models. No pay-to-list — every verdict is a pull request.',
    site: context.site ?? 'https://noemium.com',
    items,
  });
}
