import test from 'node:test';
import assert from 'node:assert/strict';
import { agentSchema, graveyardSchema, stackSchema } from '../src/content-schemas.ts';

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
