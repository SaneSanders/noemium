/**
 * Build-time Open Graph images: /og/noemium.png, /og/tools/<slug>.png,
 * /og/stacks/<slug>.png — 1200×630 PNGs rendered with satori + resvg.
 * Colors are parsed out of src/styles/tokens.css so the design tokens stay
 * the single source of truth; fonts come from the installed @fontsource packs.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const fontFile = (p: string) => readFileSync(`${root}node_modules/@fontsource/${p}`);

const tokensCss = readFileSync(`${root}src/styles/tokens.css`, 'utf8');
const token = (name: string): string =>
  tokensCss.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? '';

const C = {
  void: token('nm-bg-void'),
  panel: token('nm-bg-panel'),
  line: token('nm-line'),
  ink: token('nm-ink'),
  inkDim: token('nm-ink-dim'),
  near: token('nm-shift-near'),
  gold: token('nm-gold'),
  verdict: {
    ship: token('nm-verdict-ship'),
    situational: token('nm-verdict-situational'),
    skip: token('nm-verdict-skip'),
  } as Record<string, string>,
};

const SERIF = 'Instrument Serif';
const MONO = 'JetBrains Mono';

const fonts = [
  { name: SERIF, data: fontFile('instrument-serif/files/instrument-serif-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: SERIF, data: fontFile('instrument-serif/files/instrument-serif-latin-400-italic.woff'), weight: 400 as const, style: 'italic' as const },
  { name: MONO, data: fontFile('jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
];
const fontFiles = [
  'instrument-serif/files/instrument-serif-latin-400-normal.woff',
  'instrument-serif/files/instrument-serif-latin-400-italic.woff',
  'jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff',
].map((p) => `${root}node_modules/@fontsource/${p}`);

// Deterministic star scatter for the background (same sky, every build).
function stars(seed: number, count: number) {
  let a = seed;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => ({
    left: Math.round(rand() * 1180),
    top: Math.round(rand() * 610),
    size: rand() < 0.85 ? 2 : 3,
    color: i % 9 === 0 ? C.near : i % 23 === 0 ? C.gold : C.ink,
    opacity: 0.25 + rand() * 0.5,
  }));
}

interface GenericProps {
  kind: 'generic';
  counts: { tools: number; stacks: number; models: number };
}
interface ToolProps {
  kind: 'tool';
  name: string;
  tagline: string;
  category: string;
  pricing: string;
  verdict: 'ship' | 'situational' | 'skip';
  lastVerified: string;
}
interface StackProps {
  kind: 'stack';
  title: string;
  useCase: string;
  monthlyCost: number;
  difficulty: string;
  lastVerified: string;
}
type OgProps = GenericProps | ToolProps | StackProps;

export const getStaticPaths = (async () => {
  const [tools, stacks, models] = await Promise.all([
    getCollection('tools'),
    getCollection('stacks'),
    getCollection('models'),
  ]);
  return [
    {
      params: { slug: 'noemium' },
      props: {
        kind: 'generic',
        counts: { tools: tools.length, stacks: stacks.length, models: models.length },
      } satisfies OgProps,
    },
    ...tools.map((t) => ({
      params: { slug: `tools/${t.id}` },
      props: {
        kind: 'tool',
        name: t.data.name,
        tagline: t.data.tagline,
        category: t.data.category,
        pricing: t.data.pricing,
        verdict: t.data.verdict,
        lastVerified: t.data.last_verified,
      } satisfies OgProps,
    })),
    ...stacks.map((s) => ({
      params: { slug: `stacks/${s.id}` },
      props: {
        kind: 'stack',
        title: s.data.title,
        useCase: s.data.use_case,
        monthlyCost: s.data.monthly_cost_usd,
        difficulty: s.data.difficulty,
        lastVerified: s.data.last_verified,
      } satisfies OgProps,
    })),
  ];
}) satisfies GetStaticPaths;

const h = (type: string, props: Record<string, unknown>, ...children: unknown[]): any => ({
  type,
  props: { ...props, children: children.length <= 1 ? children[0] : children },
});

const mono = (text: string, style: Record<string, unknown> = {}) =>
  h('span', { style: { fontFamily: MONO, color: C.inkDim, ...style } }, text);

function frame(children: unknown) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        width: 1200,
        height: 630,
        backgroundColor: C.void,
        padding: 56,
        fontFamily: SERIF,
      },
    },
    // star scatter
    ...stars(42, 60).map((s) =>
      h('div', {
        style: {
          position: 'absolute',
          left: s.left,
          top: s.top,
          width: s.size,
          height: s.size,
          borderRadius: 999,
          backgroundColor: s.color,
          opacity: s.opacity,
        },
      }),
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          border: `1px solid ${C.line}`,
          backgroundColor: `${C.panel}`,
          padding: '40px 48px',
        },
      },
      children,
    ),
  );
}

function header(right: string) {
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
    h(
      'div',
      { style: { display: 'flex', alignItems: 'baseline' } },
      h('span', { style: { fontFamily: SERIF, fontSize: 30, color: C.ink, letterSpacing: 2 } }, 'NOEMIUM'),
      mono(' observatory', { fontSize: 14, marginLeft: 12 }),
    ),
    mono(right, { fontSize: 14, color: C.near }),
  );
}

function footer(meta: string) {
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
    mono(meta, { fontSize: 16 }),
    mono('noemium.com', { fontSize: 16 }),
  );
}

function verdictStamp(verdict: string) {
  return h(
    'span',
    {
      style: {
        fontFamily: MONO,
        fontSize: 20,
        letterSpacing: 4,
        textTransform: 'uppercase' as const,
        color: C.verdict[verdict] ?? C.ink,
        border: `2px solid ${C.verdict[verdict] ?? C.ink}`,
        borderRadius: 2,
        padding: '4px 14px',
        transform: 'rotate(-3deg)',
      },
    },
    verdict,
  );
}

export const GET: APIRoute = async ({ props }) => {
  const p = props as OgProps;

  let tree: any;
  if (p.kind === 'generic') {
    tree = frame([
      header('FIELD: AI · SHIFT: LIVE'),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        h('span', { style: { fontFamily: SERIF, fontSize: 96, color: C.ink } }, 'NOEMIUM'),
        h(
          'span',
          { style: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 40, color: C.inkDim, marginTop: 8 } },
          'The AI landscape, observed.',
        ),
        mono('No paid listings. Every verdict is a pull request you can audit.', {
          fontSize: 18,
          marginTop: 24,
        }),
      ),
      footer(
        `TOOLS: ${p.counts.tools} · STACKS: ${p.counts.stacks} · MODELS: ${p.counts.models}`,
      ),
    ]);
  } else if (p.kind === 'tool') {
    tree = frame([
      header(`01 /TOOLS · ${p.category.toUpperCase()}`),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center' } },
          h(
            'span',
            { style: { fontFamily: SERIF, fontSize: p.name.length > 18 ? 60 : 80, color: C.ink } },
            p.name,
          ),
          h('div', { style: { marginLeft: 28, display: 'flex' } }, verdictStamp(p.verdict)),
        ),
        h(
          'span',
          { style: { fontFamily: SERIF, fontSize: 28, color: C.inkDim, marginTop: 16 } },
          p.tagline,
        ),
      ),
      footer(`${p.category} · ${p.pricing} · verified ${p.lastVerified}`),
    ]);
  } else {
    tree = frame([
      header('02 /STACKS'),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        h(
          'span',
          { style: { fontFamily: SERIF, fontSize: p.title.length > 30 ? 52 : 68, color: C.ink } },
          p.title,
        ),
        h(
          'span',
          { style: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 26, color: C.inkDim, marginTop: 14 } },
          p.useCase,
        ),
      ),
      footer(`stack · $${p.monthlyCost}/mo · ${p.difficulty} · verified ${p.lastVerified}`),
    ]);
  }

  const svg = await satori(tree, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontFiles, loadSystemFonts: false },
    background: C.void,
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: { 'content-type': 'image/png' },
  });
};
