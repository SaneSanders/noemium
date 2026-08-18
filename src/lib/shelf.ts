/**
 * Catalog-shelf helpers: builder-kit hiding, similar-job alternatives,
 * and copy that shouldn't lie about counts.
 */

export const BUILDER_KIT_SLUGS = new Set([
  'lucide',
  'footer',
  'navbar-gallery',
  '404s',
  'origin-ui',
  'tailwind-ui',
  'aceternity-ui',
  'shadcn-ui',
  'react-bits',
  'daisyui',
  'magic-ui',
  'radix-ui',
  'heroui',
  'landingfolio',
  'refero-styles',
  'mobbin',
  '21st-dev',
  'assistant-ui',
  'horizonx',
  'tailark',
  'motion-dev',
]);

const AI_DESIGN_SLUGS = new Set([
  'v0',
  'uizard',
  'stitch',
  'onlook',
  'pen-dev',
  'framer',
  'relume',
]);

export function isBuilderKit(tool: { slug: string; category: string; tagline?: string }): boolean {
  if (AI_DESIGN_SLUGS.has(tool.slug)) return false;
  if (BUILDER_KIT_SLUGS.has(tool.slug)) return true;
  if (tool.category !== 'design') return false;
  const hay = `${tool.slug} ${tool.tagline ?? ''}`.toLowerCase();
  if (/\b(ai|llm|generative|prompt|design-to-code)\b/.test(hay)) return false;
  return /\b(icon|icons|component|components|gallery|ui kit|copy-paste|screenshot|tailwind|radix|shadcn)\b/.test(
    hay,
  );
}

/** Flagships whose shelf is a job, not a category dump. */
export const JOB_PEERS: Record<string, readonly string[]> = {
  chatgpt: ['claude', 'gemini', 'grok', 'perplexity', 'notion-ai'],
  claude: ['chatgpt', 'gemini', 'grok', 'perplexity'],
  gemini: ['chatgpt', 'claude', 'grok', 'perplexity'],
  grok: ['chatgpt', 'claude', 'gemini', 'perplexity'],
  cursor: ['claude-code', 'github-copilot', 'windsurf', 'aider', 'zed'],
  'claude-code': ['cursor', 'aider', 'github-copilot', 'opencode'],
  'github-copilot': ['cursor', 'claude-code', 'gemini-code-assist', 'zed'],
  perplexity: ['chatgpt', 'claude', 'elicit', 'consensus'],
};

export const SKIP_ALTERNATIVE: Record<string, string> = {
  fireflies: 'granola',
};

const VERDICT_RANK: Record<string, number> = { ship: 0, situational: 1, skip: 2 };

export interface RelatedTool {
  id: string;
  name: string;
  category: string;
  tagline?: string;
  verdict: string;
  last_verified: string;
}

export function relatedIds(slug: string, tools: RelatedTool[], limit = 3): string[] {
  const peers = JOB_PEERS[slug] ?? [];
  const byId = new Map(tools.map((t) => [t.id, t]));
  const peerIds = peers.filter((id) => id !== slug && byId.has(id));
  const incoming = tools
    .filter((t) => t.id !== slug && (JOB_PEERS[t.id] ?? []).includes(slug) && !peerIds.includes(t.id))
    .map((t) => t.id);
  if (peerIds.length || incoming.length) {
    return [...peerIds, ...incoming].slice(0, limit);
  }
  const self = byId.get(slug);
  const category = self?.category;
  return tools
    .filter(
      (t) =>
        t.id !== slug &&
        t.category === category &&
        !isBuilderKit({ slug: t.id, category: t.category, tagline: t.tagline }),
    )
    .sort(
      (a, b) =>
        (VERDICT_RANK[a.verdict] ?? 9) - (VERDICT_RANK[b.verdict] ?? 9) ||
        b.last_verified.localeCompare(a.last_verified) ||
        a.name.localeCompare(b.name),
    )
    .map((t) => t.id)
    .slice(0, limit);
}

export function alternativeIds(slug: string, tools: RelatedTool[]): string[] {
  const peers = JOB_PEERS[slug];
  const byId = new Map(tools.map((t) => [t.id, t]));
  if (peers) {
    const ordered = peers.filter((id) => id !== slug && byId.has(id));
    const incoming = tools
      .filter((t) => t.id !== slug && (JOB_PEERS[t.id] ?? []).includes(slug) && !ordered.includes(t.id))
      .map((t) => t.id);
    return [...ordered, ...incoming];
  }
  const self = byId.get(slug);
  return tools
    .filter(
      (t) =>
        t.id !== slug &&
        t.category === self?.category &&
        !isBuilderKit({ slug: t.id, category: t.category, tagline: t.tagline }),
    )
    .sort(
      (a, b) =>
        (VERDICT_RANK[a.verdict] ?? 9) - (VERDICT_RANK[b.verdict] ?? 9) ||
        b.last_verified.localeCompare(a.last_verified) ||
        a.name.localeCompare(b.name),
    )
    .map((t) => t.id);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function isHomepageReceipt(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return path === '/' || path === '';
  } catch {
    return false;
  }
}

export function githubToolBlob(slug: string): string {
  return `https://github.com/SaneSanders/noemium/blob/main/src/content/tools/${slug}.yaml`;
}

export const COMPARE_PRESET = 'cursor,claude-code';
export const COMPARE_HREF = `/tools/compare?tools=${COMPARE_PRESET}`;
