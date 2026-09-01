/**
 * Embeddable verdict badges: /badge/<slug>.svg for every tool that carries a
 * verdict. Self-contained two-cell SVG — cream NOEMIUM cell, verdict cell in
 * the catalog's verdict color. No fonts fetched, no scripts, no tracking.
 * Colors mirror --nm-verdict-* in src/styles/tokens.css.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

const VERDICT_COLOR: Record<string, string> = {
  ship: '#2FA36B',
  situational: '#D19A2E',
  skip: '#E0593F',
};
const CREAM = '#F3EFE4';
const INK = '#121212';

export const getStaticPaths = (async () => {
  const tools = await getCollection('tools');
  return tools
    .filter((tool) => tool.data.verdict)
    .map((tool) => ({
      params: { slug: tool.id },
      props: { name: tool.data.name, verdict: tool.data.verdict as string },
    }));
}) satisfies GetStaticPaths;

// Approximate width of one uppercase 11px monospace glyph + tracking.
const CHAR_W = 7.8;
const PAD_X = 10;
const H = 28;

const cell = (text: string) => Math.ceil(text.length * CHAR_W) + PAD_X * 2;

export const GET: APIRoute = ({ props }) => {
  const verdict = String(props.verdict);
  const color = VERDICT_COLOR[verdict];
  const label = 'NOEMIUM';
  const stamp = verdict.toUpperCase();
  const wl = cell(label);
  const wr = cell(stamp);
  const w = wl + wr;
  const y = 19;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" role="img" aria-label="Noemium verdict: ${verdict}">
  <title>Noemium verdict: ${verdict} — ${String(props.name)}</title>
  <rect width="${wl}" height="${H}" rx="4" fill="${CREAM}"/>
  <rect x="${wl}" width="${wr}" height="${H}" rx="4" fill="${color}"/>
  <rect x="${wl}" width="4" height="${H}" fill="${color}"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="11" font-weight="700" letter-spacing="1">
    <text x="${PAD_X}" y="${y}" fill="${INK}">${label}</text>
    <text x="${wl + PAD_X}" y="${y}" fill="${CREAM}">${stamp}</text>
  </g>
</svg>
`;
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
};
