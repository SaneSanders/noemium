import type { Agent } from '../content-schemas';

export type AgentCostScenario = Agent['cost_scenarios'] extends (infer Item)[] | undefined
  ? Item
  : never;

export const agentLayerLabels: Record<Agent['agent_layer'], string> = {
  'coding-harness': 'Coding harness',
  'personal-agent': 'Personal agent',
  'work-agent': 'Work agent',
  'framework-sdk': 'Framework / SDK',
  'browser-computer-use': 'Browser / computer use',
  'runtime-sandbox': 'Runtime / sandbox',
  'memory-context': 'Memory / context',
  'observability-evals': 'Observability / evals',
  'control-plane': 'Control plane',
  protocol: 'Protocol',
};

export const evidenceTierLabels: Record<Agent['evidence_tier'], string> = {
  'field-tested': 'Field tested',
  'source-verified': 'Source verified',
  radar: 'Radar',
};

const usd = (value: number) => `$${Number.isInteger(value) ? value : value.toFixed(2)}`;

export function formatCostScenario(
  scenario: Pick<AgentCostScenario, 'monthly_usd_min' | 'monthly_usd_max'>,
): string {
  if (scenario.monthly_usd_max === undefined) return `${usd(scenario.monthly_usd_min)}+/mo`;
  if (scenario.monthly_usd_min === scenario.monthly_usd_max) {
    return `${usd(scenario.monthly_usd_min)}/mo`;
  }
  return `${usd(scenario.monthly_usd_min)}–${usd(scenario.monthly_usd_max)}/mo`;
}

export function lowestAgentCost(agent: Agent): string | undefined {
  const first = agent.cost_scenarios?.[0];
  return first ? formatCostScenario(first) : undefined;
}
