import { z } from 'zod';

/**
 * Shared content schemas for Noemium.
 *
 * These are plain zod schemas with no Astro dependencies, so both
 * `src/content.config.ts` (Astro collections) and
 * `scripts/validate-content.mjs` (CI validation) import the same source
 * of truth.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected date in YYYY-MM-DD format');

/**
 * Content URLs must be absolute https:// links. Plain z.url() also accepts
 * javascript:/data: and other schemes, which would let a malicious content
 * PR smuggle script URLs into rendered hrefs.
 */
const httpsUrl = z.url().refine((u) => u.startsWith('https://'), 'only https:// URLs allowed');

export const toolCategories = [
  'coding',
  'design',
  'image',
  'video',
  'audio',
  'writing',
  'agents',
  'automation',
  'data',
  'productivity',
  'dev-infra',
  'models-api',
] as const;

const testRunSchema = z
  .object({
    date: isoDate,
    actor: z.enum(['person', 'swarm']),
    scenarios: z.array(z.string().min(1)).min(2).max(5),
    artifacts: z.array(httpsUrl).min(1),
    not_tested: z.array(z.string().min(1)).min(1),
    duration_minutes: z.number().positive(),
  })
  .strict();

export const toolSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().max(120),
  url: httpsUrl,
  category: z.enum(toolCategories),
  pricing: z.enum(['free', 'freemium', 'paid']),
  price_note: z.string().optional(),
  free_tier: z.boolean(),
  open_source: z.boolean(),
  api: z.boolean(),
  self_host: z.boolean(),
  models_used: z.array(z.string()).optional(),
  verdict: z.enum(['ship', 'situational', 'skip']),
  verdict_text: z.string().min(1),
  limitations: z.array(z.string()).min(1),
  // Optional published test protocol. Ship verdicts should carry one.
  test_run: testRunSchema.optional(),
  // Optional decision briefing. If any field is set, all three must be.
  strengths: z.array(z.string().min(1).max(180)).min(2).max(6).optional(),
  use_for: z.array(z.string().min(1).max(180)).min(2).max(5).optional(),
  skip_when: z.array(z.string().min(1).max(180)).min(2).max(5).optional(),
  receipts: z.array(httpsUrl).min(1),
  affiliate: z.enum(['none', 'declared']),
  // Referral links live ONLY here — never in `url` or `receipts`.
  affiliate_url: httpsUrl.optional(),
  evidence_tier: z.enum(['field-tested', 'source-verified', 'radar']).optional(),
  momentum: z.enum(['blueshift', 'steady', 'redshift']),
  featured: z.boolean().default(false),
  last_verified: isoDate,
  observed_by: z.string().min(1),
}).strict().superRefine((tool, ctx) => {
  // Cross-field: affiliate_url and affiliate: declared must come together.
  if (tool.affiliate_url && tool.affiliate !== 'declared') {
    ctx.addIssue({
      code: 'custom',
      path: ['affiliate_url'],
      message: 'affiliate_url requires affiliate: declared',
    });
  }
  if (tool.affiliate === 'declared' && !tool.affiliate_url) {
    ctx.addIssue({
      code: 'custom',
      path: ['affiliate'],
      message: 'affiliate: declared requires affiliate_url',
    });
  }
  const briefing = [tool.strengths, tool.use_for, tool.skip_when];
  const filled = briefing.filter((field) => field !== undefined).length;
  if (filled > 0 && filled < 3) {
    ctx.addIssue({
      code: 'custom',
      path: ['strengths'],
      message: 'strengths, use_for and skip_when must be set together',
    });
  }
});

/**
 * Operational agent guides are intentionally separate from generic tools.
 * The schema encodes Noemium's admission rule: strict guides need typed
 * primary evidence, while Radar entries are discoverable but verdict-free.
 */
export const agentLayers = [
  'coding-harness',
  'personal-agent',
  'work-agent',
  'framework-sdk',
  'browser-computer-use',
  'runtime-sandbox',
  'memory-context',
  'observability-evals',
  'control-plane',
  'protocol',
] as const;

export const evidenceKinds = [
  'availability',
  'install',
  'requirements',
  'pricing',
  'license',
  'security',
] as const;

const agentInstallSchema = z
  .object({
    method: z.enum(['command', 'download', 'web', 'docker', 'package', 'source']),
    platform: z.string().min(1),
    command: z.string().min(1).optional(),
    url: httpsUrl.optional(),
  })
  .strict()
  .refine((method) => Boolean(method.command || method.url), {
    message: 'install method requires command or url',
  });

const agentCostScenarioSchema = z
  .object({
    name: z.string().min(1),
    monthly_usd_min: z.number().nonnegative(),
    monthly_usd_max: z.number().nonnegative().optional(),
    assumptions: z.string().min(1),
  })
  .strict()
  .refine(
    (scenario) =>
      scenario.monthly_usd_max === undefined ||
      scenario.monthly_usd_max >= scenario.monthly_usd_min,
    {
      path: ['monthly_usd_max'],
      message: 'monthly_usd_max must be greater than or equal to monthly_usd_min',
    },
  );

const agentSecuritySchema = z.object({
  privilege: z.enum(['low', 'medium', 'high', 'critical']),
  data_boundary: z.string().min(1),
  cautions: z.array(z.string().min(1)).min(1),
}).strict();

const agentEvidenceSchema = z.object({
  kind: z.enum(evidenceKinds),
  url: httpsUrl,
  checked_at: isoDate,
}).strict();

export const agentSchema = z
  .object({
    name: z.string().min(1),
    vendor: z.string().min(1),
    tagline: z.string().max(140),
    url: httpsUrl,
    agent_layer: z.enum(agentLayers),
    maturity: z.enum(['stable', 'beta', 'experimental', 'prerelease']),
    license_kind: z.enum([
      'osi-open-source',
      'source-available',
      'proprietary',
      'unknown',
    ]),
    evidence_tier: z.enum(['field-tested', 'source-verified', 'radar']),
    summary: z.string().min(1),
    best_for: z.array(z.string().min(1)).min(1),
    deployment: z.array(z.enum(['local', 'self-hosted', 'managed', 'hybrid'])).min(1),
    verdict: z.enum(['ship', 'situational', 'skip']).optional(),
    verdict_text: z.string().min(1).optional(),
    install: z.array(agentInstallSchema).min(1).optional(),
    requirements: z.array(z.string().min(1)).min(1).optional(),
    providers: z.array(z.string().min(1)).min(1).optional(),
    channels: z.array(z.string().min(1)).min(1).optional(),
    cost_scenarios: z.array(agentCostScenarioSchema).min(1).optional(),
    security: agentSecuritySchema.optional(),
    limitations: z.array(z.string().min(1)).min(1),
    evidence: z.array(agentEvidenceSchema).min(1),
    last_verified: isoDate,
    observed_by: z.string().min(1),
  })
  .strict()
  .superRefine((agent, ctx) => {
    const strict = agent.evidence_tier !== 'radar';

    if (!strict) {
      if (agent.verdict) {
        ctx.addIssue({
          code: 'custom',
          path: ['verdict'],
          message: 'radar entries cannot carry a verdict',
        });
      }
      if (agent.verdict_text) {
        ctx.addIssue({
          code: 'custom',
          path: ['verdict_text'],
          message: 'radar entries cannot carry verdict text',
        });
      }
      if (agent.cost_scenarios) {
        ctx.addIssue({
          code: 'custom',
          path: ['cost_scenarios'],
          message: 'radar entries cannot carry hard cost scenarios',
        });
      }
      return;
    }

    const requiredFields = [
      ['verdict', agent.verdict],
      ['verdict_text', agent.verdict_text],
      ['install', agent.install],
      ['requirements', agent.requirements],
      ['providers', agent.providers],
      ['channels', agent.channels],
      ['cost_scenarios', agent.cost_scenarios],
      ['security', agent.security],
    ] as const;
    for (const [field, value] of requiredFields) {
      if (value === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} is required for ${agent.evidence_tier} entries`,
        });
      }
    }

    if (agent.license_kind === 'unknown') {
      ctx.addIssue({
        code: 'custom',
        path: ['license_kind'],
        message: 'strict guides require a known license kind',
      });
    }

    const evidence = new Set(agent.evidence.map((item) => item.kind));
    const requiredEvidence: (typeof evidenceKinds)[number][] = [
      'availability',
      'install',
      'requirements',
      'pricing',
      'security',
    ];
    if (agent.license_kind !== 'proprietary') requiredEvidence.push('license');
    for (const kind of requiredEvidence) {
      if (!evidence.has(kind)) {
        ctx.addIssue({
          code: 'custom',
          path: ['evidence'],
          message: `${agent.evidence_tier} entry requires ${kind} evidence`,
        });
      }
    }
  });

const budgetTwinSchema = z.object({
  monthly_cost_usd: z.number().nonnegative(),
  tools: z.array(z.string()).min(1),
  tradeoff: z.string().min(1),
}).strict();

const stackTwinSchema = z.object({
  slug: z.string().min(1),
  // What the *other* stack is relative to this one.
  kind: z.enum(['studio', 'shoestring']),
  tradeoff: z.string().min(1),
}).strict();

export const stackSchema = z
  .object({
    title: z.string().min(1),
    use_case: z.string().min(1),
    monthly_cost_usd: z.number().nonnegative(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    tools: z.array(z.string()).min(1),
    receipts: z.array(httpsUrl).min(1),
    last_verified: isoDate,
    observed_by: z.string().min(1),
    // Same recipe, cheaper cut — rendered as a toggle on this page.
    budget: budgetTwinSchema.optional(),
    // Sibling stack page (studio ↔ shoestring) when the cheaper/dearer
    // cut is its own recipe, not just a tier swap.
    twin: stackTwinSchema.optional(),
  })
  .strict()
  .superRefine((stack, ctx) => {
    if (stack.budget && stack.budget.monthly_cost_usd >= stack.monthly_cost_usd) {
      ctx.addIssue({
        code: 'custom',
        path: ['budget', 'monthly_cost_usd'],
        message: 'budget twin must cost less than the studio stack',
      });
    }
  });

export const benchmarkSchema = z.object({
  name: z.string().min(1),
  score: z.union([z.number(), z.string()]),
  source: z.string().min(1),
  date: isoDate,
}).strict();

export const modelSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  // Optional: meaningless for media models (image/video/audio)
  context_window: z.number().int().positive().optional(),
  // Token pricing (per 1M tokens); 0/0 for unit-priced media models
  price_input_per_mtok: z.number().nonnegative(),
  price_output_per_mtok: z.number().nonnegative(),
  // Unit pricing for media models (e.g. $0.04/image, $0.40/video-second)
  price_unit: z
    .enum(['mtok', 'image', 'video_second', 'audio_second', 'character'])
    .default('mtok'),
  price_amount: z.number().nonnegative().optional(),
  open_weights: z.boolean(),
  // Editorial heat score 0–100: how much the model is actually being used
  // and talked about right now (user base, board presence, launch buzz).
  // Drives the default sort on /models. Re-score on big launches.
  popularity: z.number().int().min(0).max(100),
  best_for: z.array(z.string()).min(1),
  avoid_for: z.array(z.string()).min(1),
  benchmarks: z.array(benchmarkSchema).optional(),
  source_attribution: z.string().min(1),
  last_verified: isoDate,
}).strict();

const successorSchema = z
  .object({
    name: z.string().min(1),
    slug: z.string().min(1).optional(),
    url: httpsUrl.optional(),
    note: z.string().min(1),
  })
  .strict()
  .refine((s) => Boolean(s.slug || s.url), {
    message: 'succeeded_by needs a catalog slug or an https url',
  });

const noSuccessorSchema = z.object({
  none: z.literal(true),
  note: z.string().min(1),
}).strict();

/** Graveyard — dead AI tools with the date, cause and a receipt. */
export const graveyardSchema = z.object({
  name: z.string().min(1),
  url: httpsUrl,
  category: z.enum(toolCategories),
  died: isoDate,
  cause: z.string().min(1),
  obituary: z.string().min(1),
  receipt: httpsUrl,
  last_verified: isoDate,
  // Every obituary names a replacement, or explicitly says there isn't one.
  succeeded_by: z.union([successorSchema, noSuccessorSchema]),
}).strict();

export type Tool = z.infer<typeof toolSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type Stack = z.infer<typeof stackSchema>;
export type Model = z.infer<typeof modelSchema>;
export type Graveyard = z.infer<typeof graveyardSchema>;
export type TestRun = z.infer<typeof testRunSchema>;
