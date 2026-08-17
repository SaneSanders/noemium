import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { agentSchema } from '../src/content-schemas.ts';

const agentsDir = new URL('../src/content/agents/', import.meta.url);

function loadAgents() {
  assert.equal(existsSync(agentsDir), true, 'src/content/agents must exist');
  return readdirSync(agentsDir)
    .filter((file) => file.endsWith('.yaml'))
    .sort()
    .map((file) => {
      const data = yaml.load(readFileSync(new URL(file, agentsDir), 'utf8'), {
        schema: yaml.JSON_SCHEMA,
      });
      const parsed = agentSchema.safeParse(data);
      assert.equal(
        parsed.success,
        true,
        parsed.success ? undefined : `${file}: ${JSON.stringify(parsed.error.issues)}`,
      );
      return { slug: path.basename(file, '.yaml'), data: parsed.data };
    });
}

test('ships four strict guides and ten explicitly labeled Radar entries', () => {
  const agents = loadAgents();
  assert.equal(agents.length, 14);
  assert.equal(agents.filter((agent) => agent.data.evidence_tier === 'source-verified').length, 4);
  assert.equal(agents.filter((agent) => agent.data.evidence_tier === 'radar').length, 10);
});

test('keeps Grok Bot separate from the Grok Build coding harness', () => {
  const agents = loadAgents();
  const bySlug = new Map(agents.map((agent) => [agent.slug, agent.data]));
  assert.equal(bySlug.get('grok-bot')?.agent_layer, 'work-agent');
  assert.equal(bySlug.get('grok-build')?.agent_layer, 'coding-harness');
  assert.notEqual(bySlug.get('grok-bot')?.url, bySlug.get('grok-build')?.url);
});

test('Radar entries cannot smuggle verdicts or hard prices', () => {
  for (const agent of loadAgents().filter((entry) => entry.data.evidence_tier === 'radar')) {
    assert.equal(agent.data.verdict, undefined, agent.slug);
    assert.equal(agent.data.verdict_text, undefined, agent.slug);
    assert.equal(agent.data.cost_scenarios, undefined, agent.slug);
  }
});
