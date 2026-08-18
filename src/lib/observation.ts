/** Markdown quote for "Copy observation" — not the whole YAML. */
export function observationMarkdown(
  tool: {
    name: string;
    verdict: string;
    last_verified: string;
    limitations: string[];
  },
  pageUrl: string,
): string {
  const limitation = tool.limitations[0] ?? '';
  return [
    `> **${tool.name}** — ${tool.verdict}`,
    `> Verified ${tool.last_verified}`,
    `> Limitation: ${limitation}`,
    `>`,
    `> ${pageUrl}`,
  ].join('\n');
}
