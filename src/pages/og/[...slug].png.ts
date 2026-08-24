/**
 * Build-time Open Graph images: /og/noemium.png, /og/tools/<slug>.png,
 * /og/agents/<slug>.png, /og/stacks/<slug>.png — 1200×630 PNGs rendered with satori + resvg.
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
const token = (name: string): string => {
  const value = tokensCss.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
  if (!value) {
    throw new Error(`og-image: design token --${name} not found in src/styles/tokens.css`);
  }
  return value;
};

const C = {
  paper: token('nm-bg-paper'),
  card: token('nm-bg-card'),
  ink: token('nm-ink'),
  inkDim: token('nm-ink-dim'),
  accent: token('nm-accent'),
  verdict: {
    ship: token('nm-verdict-ship'),
    situational: token('nm-verdict-situational'),
    skip: token('nm-verdict-skip'),
  } as Record<string, string>,
};

const DISPLAY = 'Archivo';
const MONO = 'JetBrains Mono';

const fonts = [
  { name: DISPLAY, data: fontFile('archivo/files/archivo-latin-800-normal.woff'), weight: 800 as const, style: 'normal' as const },
  { name: DISPLAY, data: fontFile('archivo/files/archivo-latin-900-normal.woff'), weight: 900 as const, style: 'normal' as const },
  { name: MONO, data: fontFile('jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: MONO, data: fontFile('jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff'), weight: 700 as const, style: 'normal' as const },
];
const fontFiles = [
  'archivo/files/archivo-latin-800-normal.woff',
  'archivo/files/archivo-latin-900-normal.woff',
  'jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff',
  'jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff',
].map((p) => `${root}node_modules/@fontsource/${p}`);

interface GenericProps {
  kind: 'generic';
  counts: { tools: number; agents: number; stacks: number; models: number };
}
interface QuizProps {
  kind: 'quiz';
  stackCount: number;
}
interface KitProps {
  kind: 'kit';
}
interface QuizResultProps {
  kind: 'quiz-result';
  title: string;
  monthlyCost: number;
  useCase: string;
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
interface AgentProps {
  kind: 'agent';
  name: string;
  tagline: string;
  layer: string;
  evidenceTier: 'field-tested' | 'source-verified' | 'radar';
  verdict?: 'ship' | 'situational' | 'skip';
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
type OgProps = GenericProps | ToolProps | AgentProps | StackProps | QuizProps | KitProps | QuizResultProps;

export const getStaticPaths = (async () => {
  const [tools, agents, stacks, models] = await Promise.all([
    getCollection('tools'),
    getCollection('agents'),
    getCollection('stacks'),
    getCollection('models'),
  ]);
  return [
    {
      params: { slug: 'noemium' },
      props: {
        kind: 'generic',
        counts: {
          tools: tools.length,
          agents: agents.length,
          stacks: stacks.length,
          models: models.length,
        },
      } satisfies OgProps,
    },
    // Local-only /decide experiment: build an unreferenced OG PNG so local
    // full-test runs stay green without publishing any decide page content.
    {
      params: { slug: 'decide' },
      props: {
        kind: 'generic',
        counts: {
          tools: tools.length,
          agents: agents.length,
          stacks: stacks.length,
          models: models.length,
        },
      } satisfies OgProps,
    },
    {
      params: { slug: 'quiz' },
      props: { kind: 'quiz', stackCount: stacks.length } satisfies OgProps,
    },
    {
      params: { slug: 'kit' },
      props: { kind: 'kit' } satisfies OgProps,
    },
    ...stacks.map((s) => ({
      params: { slug: `quiz/${s.id}` },
      props: {
        kind: 'quiz-result',
        title: s.data.title,
        monthlyCost: s.data.monthly_cost_usd,
        useCase: s.data.use_case,
      } satisfies OgProps,
    })),
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
    ...agents.map((agent) => ({
      params: { slug: `agents/${agent.id}` },
      props: {
        kind: 'agent',
        name: agent.data.name,
        tagline: agent.data.tagline,
        layer: agent.data.agent_layer,
        evidenceTier: agent.data.evidence_tier,
        verdict: agent.data.verdict,
        lastVerified: agent.data.last_verified,
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
        backgroundColor: C.paper,
        padding: 48,
        fontFamily: DISPLAY,
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          border: `3px solid ${C.ink}`,
          borderRadius: 14, // DESIGN.md caps radii at 14px
          backgroundColor: C.card,
          boxShadow: `10px 10px 0 0 ${C.accent}`,
          padding: '44px 52px',
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
      'span',
      { style: { fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, color: C.ink, letterSpacing: -1 } },
      'noemium',
    ),
    mono(right, { fontSize: 16, color: C.accent, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const }),
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

function verdictSticker(verdict: string) {
  return h(
    'span',
    {
      style: {
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: 3,
        textTransform: 'uppercase' as const,
        color: C.card,
        backgroundColor: C.verdict[verdict] ?? C.ink,
        borderRadius: 6,
        padding: '8px 18px',
        transform: 'rotate(-2deg)',
      },
    },
    verdict,
  );
}

const headline = (text: string, size: number) =>
  h(
    'span',
    {
      style: {
        fontFamily: DISPLAY,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 0.96,
        letterSpacing: -2,
        textTransform: 'uppercase' as const,
        color: C.ink,
        textShadow: `5px 5px 0 ${C.accent}`,
      },
    },
    text,
  );

export const GET: APIRoute = async ({ props }) => {
  const p = props as OgProps;

  let tree: any;
  if (p.kind === 'generic') {
    tree = frame([
      header('The open AI tools catalog'),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        headline('Pick AI tools without getting played.', 72),
        mono('Honest verdicts, verified prices, a receipt wherever we print a number.', {
          fontSize: 20,
          marginTop: 28,
        }),
      ),
      footer(
        `TOOLS: ${p.counts.tools} · AGENTS: ${p.counts.agents} · STACKS: ${p.counts.stacks} · MODELS: ${p.counts.models} · PAID: 0`,
      ),
    ]);
  } else if (p.kind === 'kit') {
    tree = frame([
      header('Kit'),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        headline('Save a set. Share the URL. No account.', 76),
        mono('A shareable set of catalog cards. URL plus this browser. Not a budget.', {
          fontSize: 20,
          marginTop: 28,
        }),
      ),
      footer('kit · url-shared · no fake monthly total'),
    ]);
  } else if (p.kind === 'quiz') {
    tree = frame([
      header('Stack quiz'),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        headline('Find your AI stack.', 76),
        mono('Thirty seconds. Honest verdicts, real prices, monthly cost attached.', {
          fontSize: 20,
          marginTop: 28,
        }),
      ),
      footer(`quiz · ${p.stackCount} ready-made stacks · paid placements: 0`),
    ]);
  } else if (p.kind === 'quiz-result') {
    tree = frame([
      header('Quiz match'),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        headline(p.title, p.title.length > 28 ? 52 : 68),
        mono(`$${p.monthlyCost}/mo · matched against stacks we actually run.`, {
          fontSize: 20,
          marginTop: 28,
        }),
      ),
      footer('0 paid placements · noemium.com/quiz'),
    ]);
  } else if (p.kind === 'tool') {
    tree = frame([
      header(`Catalog · ${p.category}`),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center' } },
          headline(p.name, p.name.length > 18 ? 64 : 88),
          h('div', { style: { marginLeft: 32, display: 'flex' } }, verdictSticker(p.verdict)),
        ),
        h(
          'span',
          { style: { fontFamily: MONO, fontSize: 24, color: C.inkDim, marginTop: 20 } },
          p.tagline,
        ),
      ),
      footer(`${p.category} · ${p.pricing} · verified ${p.lastVerified}`),
    ]);
  } else if (p.kind === 'agent') {
    tree = frame([
      header(`Agent Field Guide · ${p.layer.replaceAll('-', ' ')}`),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center' } },
          headline(p.name, p.name.length > 18 ? 64 : 82),
          p.verdict
            ? h('div', { style: { marginLeft: 32, display: 'flex' } }, verdictSticker(p.verdict))
            : h(
                'span',
                {
                  style: {
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: 2,
                    textTransform: 'uppercase' as const,
                    color: C.accent,
                    border: `2px solid ${C.accent}`,
                    borderRadius: 6,
                    padding: '8px 14px',
                    marginLeft: 32,
                  },
                },
                'radar · no verdict',
              ),
        ),
        h(
          'span',
          { style: { fontFamily: MONO, fontSize: 22, color: C.inkDim, marginTop: 20 } },
          p.tagline,
        ),
      ),
      footer(`${p.evidenceTier} · ${p.layer} · verified ${p.lastVerified}`),
    ]);
  } else {
    tree = frame([
      header('Stacks'),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        headline(p.title, p.title.length > 30 ? 56 : 72),
        h(
          'span',
          { style: { fontFamily: MONO, fontSize: 22, color: C.inkDim, marginTop: 18 } },
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
    background: C.paper,
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: { 'content-type': 'image/png' },
  });
};
