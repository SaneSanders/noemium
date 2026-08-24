import test from 'node:test';
import assert from 'node:assert/strict';
import { agentSchema, graveyardSchema, jobSchema, modelSchema, stackSchema, toolSchema } from '../src/content-schemas.ts';

const strictAgent = {
  name: 'Example Agent',
  vendor: 'Example',
  tagline: 'A complete agent fixture used to verify the catalog contract.',
  url: 'https://example.com',
  agent_layer: 'personal-agent',
  maturity: 'beta',
  license_kind: 'proprietary',
  evidence_tier: 'source-verified',
  summary: 'A complete source-verified fixture.',
  best_for: ['testing the content contract'],
  deployment: ['managed'],
  verdict: 'situational',
  verdict_text: 'Useful with caveats.',
  install: [{ method: 'web', platform: 'web', url: 'https://example.com/start' }],
  requirements: ['An account'],
  providers: ['Example Model'],
  channels: ['web'],
  cost_scenarios: [
    {
      name: 'paid',
      monthly_usd_min: 20,
      monthly_usd_max: 20,
      assumptions: 'One seat.',
    },
  ],
  security: {
    privilege: 'high',
    data_boundary: 'Vendor cloud',
    cautions: ['Use a separate account.'],
  },
  limitations: ['Beta software.'],
  evidence: ['install', 'requirements', 'pricing', 'security', 'availability'].map((kind) => ({
    kind,
    url: 'https://example.com/docs',
    checked_at: '2026-08-17',
  })),
  last_verified: '2026-08-17',
  observed_by: 'tester',
};

test('accepts a fully receipted source-verified guide', () => {
  assert.equal(agentSchema.safeParse(strictAgent).success, true);
});

test('rejects a strict guide missing security evidence', () => {
  const data = {
    ...strictAgent,
    evidence: strictAgent.evidence.filter((item) => item.kind !== 'security'),
  };
  assert.equal(agentSchema.safeParse(data).success, false);
});

test('rejects a radar verdict', () => {
  const data = { ...strictAgent, evidence_tier: 'radar', verdict: 'ship' };
  assert.equal(agentSchema.safeParse(data).success, false);
});

test('rejects a cost range whose maximum is below its minimum', () => {
  const data = {
    ...strictAgent,
    cost_scenarios: [
      {
        ...strictAgent.cost_scenarios[0],
        monthly_usd_min: 30,
        monthly_usd_max: 20,
      },
    ],
  };
  assert.equal(agentSchema.safeParse(data).success, false);
});

const toolBase = {
  name: 'Example Tool',
  tagline: 'A fixture for the briefing contract.',
  url: 'https://example.com',
  category: 'coding',
  pricing: 'free',
  free_tier: true,
  open_source: true,
  api: false,
  self_host: true,
  verdict: 'situational',
  verdict_text: 'Useful with caveats.',
  limitations: ['Needs a human in the loop.'],
  receipts: ['https://example.com/pricing'],
  affiliate: 'none',
  momentum: 'steady',
  last_verified: '2026-08-23',
  observed_by: 'tester',
};

test('accepts a tool without a briefing', () => {
  assert.equal(toolSchema.safeParse(toolBase).success, true);
});

test('accepts a complete tool briefing', () => {
  const data = {
    ...toolBase,
    strengths: ['Fast on the happy path.', 'Cheap enough to try this afternoon.'],
    use_for: ['Solo daily coding.', 'A repo you already know.'],
    skip_when: ['You need an audit trail.', 'The vendor cannot see the code.'],
  };
  assert.equal(toolSchema.safeParse(data).success, true);
});

test('rejects a half-written tool briefing', () => {
  const data = {
    ...toolBase,
    strengths: ['Fast on the happy path.', 'Cheap enough to try this afternoon.'],
  };
  assert.equal(toolSchema.safeParse(data).success, false);
});

test('accepts a complete tool test_run', () => {
  const data = {
    ...toolBase,
    verdict: 'ship',
    test_run: {
      date: '2026-08-24',
      actor: 'person',
      scenarios: ['Daily coding session.', 'Multi-file refactor.'],
      artifacts: ['https://example.com/run-log'],
      not_tested: ['Enterprise admin panel.'],
      duration_minutes: 120,
    },
  };
  assert.equal(toolSchema.safeParse(data).success, true);
});

test('rejects a test_run with only one scenario', () => {
  const data = {
    ...toolBase,
    verdict: 'ship',
    test_run: {
      date: '2026-08-24',
      actor: 'swarm',
      scenarios: ['Single scenario.'],
      artifacts: ['https://example.com/run-log'],
      not_tested: ['Edge cases.'],
      duration_minutes: 60,
    },
  };
  assert.equal(toolSchema.safeParse(data).success, false);
});

const stackBase = {
  title: 'Content pipeline',
  use_case: 'Ship a weekly thread.',
  monthly_cost_usd: 61,
  difficulty: 'beginner',
  tools: ['perplexity'],
  receipts: ['https://example.com'],
  last_verified: '2026-08-18',
  observed_by: 'tester',
};

test('accepts a studio stack with a cheaper budget twin', () => {
  const data = {
    ...stackBase,
    budget: {
      monthly_cost_usd: 14,
      tools: ['chatgpt'],
      tradeoff: 'You lose cited research.',
    },
  };
  assert.equal(stackSchema.safeParse(data).success, true);
});

test('rejects a budget twin that is not cheaper', () => {
  const data = {
    ...stackBase,
    budget: {
      monthly_cost_usd: 61,
      tools: ['chatgpt'],
      tradeoff: 'Same price.',
    },
  };
  assert.equal(stackSchema.safeParse(data).success, false);
});

const modelBase = {
  name: 'Test Model',
  provider: 'Test Lab',
  context_window: 128000,
  price_input_per_mtok: 0.5,
  price_output_per_mtok: 1.5,
  open_weights: false,
  popularity: 50,
  best_for: ['General reasoning.'],
  avoid_for: ['Cost-sensitive routing.'],
  source_attribution: 'Test attribution.',
  last_verified: '2026-08-24',
};

test('accepts a model with a retiring successor', () => {
  const data = {
    ...modelBase,
    retiring: {
      date: '2026-08-31',
      successor: 'mistral-medium-3-5',
    },
  };
  assert.equal(modelSchema.safeParse(data).success, true);
});

test('rejects a retiring block without a successor', () => {
  const data = {
    ...modelBase,
    retiring: {
      date: '2026-08-31',
    },
  };
  assert.equal(modelSchema.safeParse(data).success, false);
});

const jobBase = {
  title: 'Meeting notes',
  use_case: 'Capture calls.',
  picks: [
    { tool: 'fathom', role: 'recommended', why: 'Best summary.' },
    { tool: 'granola', role: 'alternative', why: 'Hybrid notes.' },
    { tool: 'fireflies', role: 'skip', why: 'Too noisy.' },
  ],
  check_manually: ['Check platform support.', 'Verify privacy policy.'],
  last_verified: '2026-08-24',
  observed_by: 'tester',
};

test('accepts a valid job with one recommended pick', () => {
  assert.equal(jobSchema.safeParse(jobBase).success, true);
});

test('rejects a job without a recommended pick', () => {
  const data = {
    ...jobBase,
    picks: [
      { tool: 'fathom', role: 'alternative', why: 'Best summary.' },
      { tool: 'granola', role: 'alternative', why: 'Hybrid notes.' },
      { tool: 'fireflies', role: 'skip', why: 'Too noisy.' },
    ],
  };
  assert.equal(jobSchema.safeParse(data).success, false);
});

test('rejects a job with more than one recommended pick', () => {
  const data = {
    ...jobBase,
    picks: [
      { tool: 'fathom', role: 'recommended', why: 'Best summary.' },
      { tool: 'granola', role: 'recommended', why: 'Also good.' },
      { tool: 'fireflies', role: 'skip', why: 'Too noisy.' },
    ],
  };
  assert.equal(jobSchema.safeParse(data).success, false);
});

test('rejects a job pick with why over 280 characters', () => {
  const data = {
    ...jobBase,
    picks: [{ ...jobBase.picks[0], why: 'x'.repeat(281) }],
  };
  assert.equal(jobSchema.safeParse(data).success, false);
});

test('accepts data_sensitivity with unknown values', () => {
  const data = {
    ...toolBase,
    data_sensitivity: {
      trains_on_inputs: 'unknown',
      eu_region: 'unknown',
      local_processing: false,
    },
  };
  assert.equal(toolSchema.safeParse(data).success, true);
});

test('rejects garbage data_sensitivity values', () => {
  const data = {
    ...toolBase,
    data_sensitivity: {
      trains_on_inputs: 'maybe',
    },
  };
  assert.equal(toolSchema.safeParse(data).success, false);
});

test('requires a graveyard successor or an explicit none', () => {
  const grave = {
    name: 'Dead Tool',
    url: 'https://example.com',
    category: 'audio',
    died: '2025-12-31',
    cause: 'Shutdown.',
    obituary: 'It died.',
    receipt: 'https://example.com/obit',
    last_verified: '2026-08-18',
  };
  assert.equal(graveyardSchema.safeParse(grave).success, false);
  assert.equal(
    graveyardSchema.safeParse({
      ...grave,
      succeeded_by: { none: true, note: 'No drop-in replacement.' },
    }).success,
    true,
  );
  assert.equal(
    graveyardSchema.safeParse({
      ...grave,
      succeeded_by: {
        name: 'Inworld TTS',
        url: 'https://inworld.ai/resources/migrate-from-playht',
        note: 'API-shaped successor after the Meta acquihire.',
      },
    }).success,
    true,
  );
});
