/** Markdown quote for "Copy observation" — not the whole YAML. */
export function observationMarkdown(
  tool: {
    name: string;
    verdict?: string;
    last_verified: string;
    limitations: string[];
  },
  pageUrl: string,
): string {
  const limitation = tool.limitations[0] ?? '';
  const stamp = tool.verdict ?? 'radar';
  return [
    `> **${tool.name}** — ${stamp}`,
    `> Verified ${tool.last_verified}`,
    `> Limitation: ${limitation}`,
    `>`,
    `> ${pageUrl}`,
  ].join('\n');
}
