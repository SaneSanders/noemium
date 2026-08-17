#!/usr/bin/env node
/**
 * Weekly diff — regenerates src/data/changelog.json from git history of the
 * content collections. Run weekly (npm run weekly-diff) and commit the result:
 * the page renders committed data, so builds stay deterministic and CI never
 * shells out to git.
 *
 * A week is ISO (Mon–Sun, UTC). Only data-level changes are reported —
 * prices, verdicts, monthly costs, list membership. Copy edits, last_verified
 * bumps and receipt churn are intentionally noise-free.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIRS = [
  'src/content/tools',
  'src/content/agents',
  'src/content/models',
  'src/content/stacks',
];
const OUT = join(root, 'src/data/changelog.json');

// Fields whose changes are worth printing; keys are collection names.
const TRACKED = {
  tools: { pricing: 'pricing', price_note: 'price note', verdict: 'verdict' },
  agents: { evidence_tier: 'evidence tier', maturity: 'maturity', verdict: 'verdict' },
  models: {
    price_input_per_mtok: 'input $/Mtok',
    price_output_per_mtok: 'output $/Mtok',
    price_amount: 'price',
    price_unit: 'price unit',
  },
  stacks: { monthly_cost_usd: 'monthly cost', difficulty: 'difficulty' },
};

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trimEnd();
const collectionOf = (p) => {
  const seg = p.split('/');
  return seg[1] === 'content' ? seg[2] : undefined;
};
const slugOf = (p) => p.split('/').at(-1).replace(/\.(yaml|md)$/, '');

// ISO week key like "2026-W33" plus the week's Monday (UTC).
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // this week's Thursday
  const isoYear = d.getUTCFullYear();
  const jan1DayNum = (new Date(Date.UTC(isoYear, 0, 1)).getUTCDay() + 6) % 7;
  const week1Thu = Date.UTC(isoYear, 0, 1 + ((3 - jan1DayNum + 7) % 7));
  const week = Math.round((d.getTime() - week1Thu) / 604800000) + 1;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - 3); // Monday
  return { key: `${isoYear}-W${String(week).padStart(2, '0')}`, start };
}

function parseEntry(text, path) {
  const opts = { schema: yaml.JSON_SCHEMA };
  if (path.endsWith('.md')) {
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    return m ? yaml.load(m[1], opts) : {};
  }
  return yaml.load(text, opts);
}

const blobCache = new Map();
function blobAt(commit, path) {
  const k = `${commit}:${path}`;
  if (!blobCache.has(k)) {
    try {
      blobCache.set(k, git('show', `${commit}:${path}`));
    } catch {
      blobCache.set(k, undefined);
    }
  }
  return blobCache.get(k);
}

// --- collect events ---------------------------------------------------------
const log = git(
  'log',
  '--format=%H%x1f%aI%x1e',
  '--name-status',
  '-M',
  '--',
  ...CONTENT_DIRS,
);

const eventsByPath = new Map(); // path -> [{sha, date, status, prevSha}]
let currentCommit = null;
for (const line of log.split('\n')) {
  if (line.includes('\x1f')) {
    const [sha, dateRaw] = line.split('\x1f');
    currentCommit = { sha, date: new Date(dateRaw.replace(/\x1e/g, '')) };
  } else if (line && currentCommit) {
    const [status, ...rest] = line.split('\t');
    const path = rest.at(-1);
    if (!CONTENT_DIRS.some((d) => path.startsWith(`${d}/`))) continue;
    if (!eventsByPath.has(path)) eventsByPath.set(path, []);
    eventsByPath.get(path).push({ ...currentCommit, status: status[0], prevSha: `${currentCommit.sha}^` });
  }
}
for (const events of eventsByPath.values()) events.reverse(); // oldest first

// --- fold events into weeks -------------------------------------------------
const weeks = new Map(); // key -> {start, end}
const addWeek = (date) => {
  const { key, start } = isoWeek(date);
  if (!weeks.has(key)) {
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    weeks.set(key, { start, end });
  }
  return key;
};

const result = new Map(); // weekKey -> {added:[], removed:[], changed:[]}
const bucket = (key) => {
  if (!result.has(key)) result.set(key, { added: [], removed: [], changed: [] });
  return result.get(key);
};
const meta = (path, data) => ({
  collection: collectionOf(path),
  slug: slugOf(path),
  name: data?.name ?? data?.title ?? slugOf(path),
  category: data?.category,
});

for (const [path, events] of eventsByPath) {
  const col = collectionOf(path);
  if (!col) continue;

  const byWeek = new Map();
  for (const ev of events) {
    const key = addWeek(ev.date);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key).push(ev);
  }

  for (const [key, evs] of byWeek) {
    const wk = bucket(key);
    const first = evs[0];
    const last = evs.at(-1);

    if (first.status === 'A') {
      wk.added.push(meta(path, parseEntry(blobAt(first.sha, path) ?? '', path)));
    }
    if (last.status === 'D') {
      wk.removed.push(meta(path, parseEntry(blobAt(last.prevSha, path) ?? '', path)));
      continue;
    }

    // Baseline: the version that ended the previous week — or the version at
    // birth when the file was created this same week, so post-birth fixes
    // inside the birth week still surface as changes.
    const weekStart = weeks.get(key).start;
    const prior = events.filter((e) => e.date < weekStart).at(-1);
    const baseline = prior ?? first;
    if (baseline.status === 'D') continue; // deleted earlier, resurrected — nothing to diff
    const before = parseEntry(blobAt(baseline.sha, path) ?? '', path);
    const after = parseEntry(blobAt(last.sha, path) ?? '', path);
    for (const [field, label] of Object.entries(TRACKED[col] ?? {})) {
      const a = before?.[field];
      const b = after?.[field];
      if (a === undefined && b === undefined) continue;
      if (String(a ?? '') !== String(b ?? '')) {
        wk.changed.push({ ...meta(path, after), field: label, from: a ?? null, to: b ?? null });
      }
    }
  }
}

const weeksOut = [...result.entries()]
  .filter(([, v]) => v.added.length || v.removed.length || v.changed.length)
  .map(([key, v]) => {
    const { start, end } = weeks.get(key);
    return {
      id: key,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      counts: {
        added: v.added.length,
        removed: v.removed.length,
        changed: v.changed.length,
      },
      ...v,
    };
  })
  .sort((a, b) => b.from.localeCompare(a.from));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({ generated_at: new Date().toISOString(), weeks: weeksOut }, null, 2)}\n`);

const totals = weeksOut.reduce(
  (acc, w) => ({
    added: acc.added + w.counts.added,
    removed: acc.removed + w.counts.removed,
    changed: acc.changed + w.counts.changed,
  }),
  { added: 0, removed: 0, changed: 0 },
);
console.log(`✓ changelog: ${weeksOut.length} week(s) — +${totals.added} / −${totals.removed} / ~${totals.changed} → ${OUT}`);
