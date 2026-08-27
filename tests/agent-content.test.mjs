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

const HARNESS_SLUGS = [
  'claude-code',
  'openai-codex',
  'cursor',
  'amp',
  'opencode',
  'aider',
  'cline',
  'goose',
  'pi',
  'kilo-code',
];

test('ships coding harness field guides without a fake radar stamp', () => {
  const agents = loadAgents();
  const bySlug = new Map(agents.map((agent) => [agent.slug, agent.data]));
  for (const slug of HARNESS_SLUGS) {
    assert.equal(bySlug.has(slug), true, slug);
    assert.notEqual(bySlug.get(slug)?.evidence_tier, 'radar', slug);
    assert.equal(bySlug.get(slug)?.agent_layer, 'coding-harness', slug);
  }
  assert.ok(agents.filter((agent) => agent.data.evidence_tier === 'radar').length >= 1);
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
