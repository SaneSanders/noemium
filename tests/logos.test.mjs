import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logosDir = path.join(root, 'public', 'logos');

function slugs(dir, ext) {
  return readdirSync(path.join(root, dir))
    .filter((f) => f.endsWith(ext))
    .map((f) => f.slice(0, -ext.length))
    .sort();
}

function hasLogo(slug) {
  return existsSync(path.join(logosDir, `${slug}.png`)) || existsSync(path.join(logosDir, `${slug}.svg`));
}

test('every tool and agent has a committed logo file', () => {
  const tools = slugs('src/content/tools', '.yaml');
  const agents = slugs('src/content/agents', '.yaml');
  const missing = [...tools, ...agents].filter((slug) => !hasLogo(slug));
  assert.deepEqual(missing, [], `missing logos:\n  ${missing.join('\n  ')}`);
});

test('model providers used in the catalog have a lab mark', () => {
  const files = slugs('src/content/models', '.yaml');
  // Provider marks are reused from tool slugs (or meta.png). The mapping
  // lives in src/lib/logos.ts — this test only guards the files it needs.
  const needed = [
    'openai-api',
    'anthropic-api',
    'google-ai-studio',
    'xai-api',
    'deepseek-api',
    'mistral-api',
    'meta',
    'qwen-api',
    'qwen-image',
    'kimi-code',
    'glm-api',
    'hunyuan-api',
    'minimax-api',
    'bytedance-seed',
    'elevenlabs',
    'fish-audio',
    'flux',
    'recraft',
  ];
  const missing = needed.filter((slug) => !hasLogo(slug));
  assert.deepEqual(missing, [], `missing provider marks:\n  ${missing.join('\n  ')}`);
  assert.ok(files.length > 0);
});

test('GitHub-hosted cards do not share the generic octocat', () => {
  const slugs = ['github-copilot', 'osa', 'singular', 'zeroclaw'];
  const hashes = slugs.map((slug) => {
    const file = path.join(logosDir, `${slug}.png`);
    assert.equal(existsSync(file), true, `missing ${slug}.png`);
    return createHash('sha256').update(readFileSync(file)).digest('hex');
  });
  assert.equal(new Set(hashes).size, slugs.length, 'copilot/osa/singular/zeroclaw must be distinct marks');
});
