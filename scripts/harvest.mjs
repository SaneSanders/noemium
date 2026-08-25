#!/usr/bin/env node
/**
 * Harvest CLI — observe the world, write a report, never patch YAML.
 *
 *   npm run harvest              # all enabled kinds → reports/harvest/
 *   npm run harvest -- --kind github,status
 *   npm run harvest:brief        # markdown from latest.json
 *
 * GitHub Actions also opens/updates a single "harvest: world watch" issue.
 * Judgement is local: see scripts/harvest-judge.md, then a content PR.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorldStatus, formatBrief, loadCatalog, loadSources, runHarvest } from './lib/harvest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = '<!-- harvest:watch -->';
const LABEL = 'harvest';

function parseArgs(argv) {
  const out = {
    cmd: argv[0] && !argv[0].startsWith('-') ? argv[0] : 'run',
    kind: null,
    outDir: join(root, 'reports/harvest'),
    from: join(root, 'reports/harvest/latest.json'),
    since: null,
    snapshot: null,
    noIssue: false,
  };
  const rest = out.cmd === argv[0] ? argv.slice(1) : argv;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--kind') out.kind = rest[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--out') out.outDir = rest[++i];
    else if (a === '--from') out.from = rest[++i];
    else if (a === '--since') out.since = rest[++i];
    else if (a === '--no-issue') out.noIssue = true;
    else if (a === '--snapshot') {
      const next = rest[i + 1];
      if (next && !next.startsWith('-')) out.snapshot = rest[++i];
      else out.snapshot = join(root, 'src/data/world-status.json');
    }
  }
  return out;
}

function writeReport(outDir, report) {
  mkdirSync(outDir, { recursive: true });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const md = formatBrief(report);
  const day = report.generated_at.slice(0, 10);
  writeFileSync(join(outDir, 'latest.json'), json);
  writeFileSync(join(outDir, 'latest.md'), md);
  writeFileSync(join(outDir, `${day}.json`), json);
  writeFileSync(join(outDir, `${day}.md`), md);
  return md;
}

function sanitizeIssueText(text) {
  return String(text)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[[\]()`]/g, '');
}

async function syncIssue(md) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    console.log('no GITHUB_TOKEN/GITHUB_REPOSITORY — skip issue sync.');
    return;
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

  await api('/labels', {
    method: 'POST',
    body: JSON.stringify({ name: LABEL, color: '1D4ED8', description: 'Weekly harvest world-watch' }),
  }).then((r) => r.status === 201 || console.log(`label ${LABEL} already exists`));

  const list = await api(`/issues?labels=${LABEL}&state=open&per_page=20`).then((r) => r.json());
  const existing = (Array.isArray(list) ? list : []).find((i) => (i.body ?? '').includes(MARKER));
  const body = `${MARKER}\n\n${md}`.slice(0, 60_000);
  const title = 'harvest: world watch';

  if (existing) {
    const res = await api(`/issues/${existing.number}`, { method: 'PATCH', body: JSON.stringify({ title, body }) });
    if (!res.ok) console.error(`failed to update issue #${existing.number}: ${res.status}`);
    else console.log(`✓ harvest issue #${existing.number} updated`);
    return;
  }
  const res = await api('/issues', {
    method: 'POST',
    body: JSON.stringify({ title: sanitizeIssueText(title), body, labels: [LABEL] }),
  });
  if (!res.ok) console.error(`failed to open harvest issue: ${res.status}`);
  else {
    const created = await res.json();
    console.log(`✓ harvest issue #${created.number} opened`);
  }
}

const args = parseArgs(process.argv.slice(2));

if (args.cmd === 'brief') {
  const report = JSON.parse(readFileSync(args.from, 'utf8'));
  const md = formatBrief(report);
  process.stdout.write(md.endsWith('\n') ? md : `${md}\n`);
  process.exit(0);
}

if (args.cmd !== 'run') {
  console.error(`unknown command ${args.cmd} — expected run | brief`);
  process.exit(2);
}

const sources = loadSources(readFileSync(join(root, 'src/data/harvest-sources.yaml'), 'utf8'));
const catalog = loadCatalog(root);
const report = await runHarvest({
  sources,
  catalog,
  kinds: args.kind ?? undefined,
  since: args.since ?? undefined,
  githubToken: process.env.GITHUB_TOKEN,
});
const md = writeReport(args.outDir, report);
const counts = report.findings.reduce(
  (acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  },
  { alert: 0, warn: 0, info: 0 },
);
console.log(
  `✓ harvest ${report.generated_at.slice(0, 10)} — ${counts.alert} alert / ${counts.warn} warn / ${counts.info} info / ${report.errors.length} error(s) → ${args.outDir}`,
);
if (report.errors.length) {
  for (const e of report.errors) console.log(`  error ${e.kind}${e.slug ? ` ${e.slug}` : ''}: ${e.message}`);
}
if (args.snapshot) {
  const snap = buildWorldStatus(report.generated_at, report.world_status ?? []);
  writeFileSync(args.snapshot, `${JSON.stringify(snap, null, 2)}\n`);
  console.log(`✓ world-status ${snap.counts.down} down / ${snap.counts.pages} pages → ${args.snapshot}`);
}
if (!args.noIssue) await syncIssue(md);
process.stdout.write(md.endsWith('\n') ? md : `${md}\n`);
