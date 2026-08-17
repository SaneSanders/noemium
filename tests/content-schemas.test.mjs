import test from 'node:test';
import assert from 'node:assert/strict';
import { agentSchema } from '../src/content-schemas.ts';

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
