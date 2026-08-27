import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { skillSchema } from '../src/content-schemas.ts';

const skillsDir = new URL('../src/content/skills/', import.meta.url);

function loadSkills() {
  assert.equal(existsSync(skillsDir), true, 'src/content/skills must exist');
  return readdirSync(skillsDir)
    .filter((file) => file.endsWith('.yaml'))
    .sort()
    .map((file) => {
      const data = yaml.load(readFileSync(new URL(file, skillsDir), 'utf8'), {
        schema: yaml.JSON_SCHEMA,
      });
      const parsed = skillSchema.safeParse(data);
      assert.equal(
        parsed.success,
        true,
        parsed.success ? undefined : `${file}: ${JSON.stringify(parsed.error.issues)}`,
      );
      return { slug: path.basename(file, '.yaml'), data: parsed.data };
    });
}

test('loads the skills collection and keeps at least one graded card', () => {
  const skills = loadSkills();
  assert.ok(skills.length >= 1);
  assert.ok(skills.some((skill) => skill.data.evidence_tier !== 'radar'));
  assert.equal(skills.some((skill) => skill.slug === 'superpowers'), true);
});

test('Radar skills cannot smuggle a verdict', () => {
  for (const skill of loadSkills().filter((entry) => entry.data.evidence_tier === 'radar')) {
    assert.equal(skill.data.verdict, undefined, skill.slug);
    assert.equal(skill.data.verdict_text, undefined, skill.slug);
  }
});
