#!/usr/bin/env node
/**
 * Stale check — opens "adopt this page" issues for tool cards whose
 * last_verified is older than STALE_DAYS, and closes the issues once the card
 * is fresh again. Runs weekly from .github/workflows/stale-check.yml.
 *
 * Without GITHUB_TOKEN (local run) it only prints the report.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const STALE_DAYS = 60;
const LABEL = 'adopt-a-page';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/content/tools');
const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;

function sanitizeIssueText(text) {
  return String(text)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[[\]()`]/g, '');
}

const stale = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort()) {
  const data = yaml.load(readFileSync(join(dir, file), 'utf8'), { schema: yaml.JSON_SCHEMA });
  const ageDays = (Date.now() - new Date(`${data.last_verified}T00:00:00Z`).getTime()) / 86_400_000;
  if (ageDays > STALE_DAYS) {
    stale.push({ slug: file.replace(/\.yaml$/, ''), name: data.name, verified: data.last_verified, age: Math.floor(ageDays) });
  }
}

console.log(`stale cards (> ${STALE_DAYS} days): ${stale.length}`);
for (const s of stale) console.log(`  ${s.slug} — ${s.name} (verified ${s.verified}, ${s.age}d)`);

if (!token || !repo) {
  console.log('no GITHUB_TOKEN/GITHUB_REPOSITORY — dry run, done.');
  process.exit(0);
}

const api = (path, init = {}) =>
  fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

// The label must exist before issues can carry it.
await api('/labels', {
  method: 'POST',
  body: JSON.stringify({ name: LABEL, color: '3B5BFF', description: 'Card needs a re-check — adopt it via PR' }),
}).then((r) => r.status === 201 || console.log(`label ${LABEL} already exists`));

const list = await api(`/issues?labels=${LABEL}&state=open&per_page=100`).then((r) => r.json());
const openBySlug = new Map(
  (Array.isArray(list) ? list : [])
    .map((i) => {
      const m = (i.body ?? '').match(/<!-- stale:([a-z0-9-]+) -->/);
      return m ? [m[1], i.number] : null;
    })
    .filter(Boolean),
);

const desired = new Set(stale.map((s) => s.slug));
let opened = 0;
let closed = 0;

for (const s of stale) {
  if (openBySlug.has(s.slug)) continue;
  const safeName = sanitizeIssueText(s.name);
  const safeSlug = sanitizeIssueText(s.slug);
  const safeVerified = sanitizeIssueText(s.verified);
  const safeAge = sanitizeIssueText(s.age);
  const res = await api('/issues', {
    method: 'POST',
    body: JSON.stringify({
      title: `adopt this page: ${safeName} (${safeSlug})`,
      body: [
        `<!-- stale:${safeSlug} -->`,
        `\`${safeSlug}\` was last verified **${safeVerified}** (${safeAge} days ago).`,
        '',
        'Adopt it: open the card, re-check the price and verdict against the vendor pages, bump `last_verified`, open a PR.',
        `https://github.com/${repo}/edit/main/src/content/tools/${safeSlug}.yaml`,
        '',
        'This issue closes automatically when the card is fresh again.',
      ].join('\n'),
      labels: [LABEL],
    }),
  });
  if (res.ok) opened += 1;
  else console.error(`failed to open issue for ${safeSlug}: ${res.status}`);
}

for (const [slug, number] of openBySlug) {
  if (desired.has(slug)) continue;
  const res = await api(`/issues/${number}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
  });
  if (res.ok) closed += 1;
  else console.error(`failed to close issue #${number}: ${res.status}`);
}

console.log(`✓ stale check: ${stale.length} stale, ${opened} issue(s) opened, ${closed} closed`);
