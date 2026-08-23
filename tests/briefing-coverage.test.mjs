import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import { toolSchema } from '../src/content-schemas.ts';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/content/tools');

test('every ship tool carries a complete briefing', () => {
  const missing = [];
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.yaml')).sort()) {
    const data = load(readFileSync(join(dir, file), 'utf8'));
    const parsed = toolSchema.safeParse(data);
    assert.equal(parsed.success, true, `${file} failed schema`);
    if (data.verdict !== 'ship') continue;
    if (!data.strengths || !data.use_for || !data.skip_when) {
      missing.push(file.replace(/\.yaml$/, ''));
    }
  }
  assert.deepEqual(missing, []);
});
