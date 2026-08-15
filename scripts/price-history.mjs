#!/usr/bin/env node
/**
 * Price history — rebuilds src/data/price-history.json from git history of
 * src/content/models. Run after repricing PRs (npm run price-history) and
 * commit the result: the site renders committed data and CI never shells out
 * to git.
 *
 * A timeline point is recorded only when a price field actually changed, so
 * the file stays small and every point is a real price move. The longer the
 * repo lives, the longer the history — that's the moat.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'src/content/models');
const OUT = join(root, 'src/data/price-history.json');

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trimEnd();

const fieldsOf = (data) => ({
  in: data?.price_input_per_mtok,
  out: data?.price_output_per_mtok,
  unit: data?.price_unit ?? 'mtok',
  amount: data?.price_amount,
});

const models = [];
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.yaml')).sort()) {
  const slug = file.replace(/\.yaml$/, '');
  const path = `src/content/models/${file}`;
  // Oldest first: %H sha, %aI author date.
  const log = git('log', '--reverse', '--format=%H%x1f%aI', '--', path);
  const commits = log
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [sha, date] = l.split('\x1f');
      return { sha, date: date.slice(0, 10) };
    });

  const points = [];
  let name = slug;
  for (const c of commits) {
    let data;
    try {
      data = yaml.load(git('show', `${c.sha}:${path}`), { schema: yaml.JSON_SCHEMA });
    } catch {
      continue; // parse hiccup in an old revision — skip that revision
    }
    name = data?.name ?? name;
    const p = { date: c.date, ...fieldsOf(data) };
    const prev = points.at(-1);
    if (!prev || JSON.stringify(prev, (k, v) => (k === 'date' ? undefined : v)) !== JSON.stringify(p, (k, v) => (k === 'date' ? undefined : v))) {
      points.push(p);
    }
  }
  if (points.length > 0) models.push({ slug, name, points });
}

mkdirSync(dirname(OUT), { recursive: true });
const started = models.flatMap((m) => m.points.map((p) => p.date)).sort()[0];
writeFileSync(OUT, `${JSON.stringify({ generated_at: new Date().toISOString(), started_tracking: started ?? null, models }, null, 2)}\n`);

const movers = models.filter((m) => m.points.length > 1);
console.log(`✓ price history: ${models.length} model(s), ${movers.length} with ≥2 price points → ${OUT}`);
