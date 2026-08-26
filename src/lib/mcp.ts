/**
 * MCP shelf — tools in category mcp, plus named catalogue cousins.
 * Not a scrape of the official registry.
 */

export const RELATED_MCP = ['pharos', 'cogni', 'doberman'] as const;

export type McpTool = {
  slug: string;
  name: string;
  tagline: string;
  verdict: 'ship' | 'situational' | 'skip';
  category: string;
};

export function collectMcp(tools: McpTool[]): {
  shelf: McpTool[];
  related: McpTool[];
} {
  const rank = { ship: 0, situational: 1, skip: 2 };
  const bySlug = new Map(tools.map((t) => [t.slug, t]));
  const shelf = tools
    .filter((t) => t.category === 'mcp')
    .sort((a, b) => rank[a.verdict] - rank[b.verdict] || a.name.localeCompare(b.name));
  const related = RELATED_MCP.map((slug) => bySlug.get(slug)).filter(
    (t): t is McpTool => Boolean(t),
  );
  return { shelf, related };
}
