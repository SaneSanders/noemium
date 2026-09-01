#!/usr/bin/env node
/**
 * Track record — mines the full git history for verdict flips and graveyard
 * burials, then writes src/data/track-record.json. The page renders this
 * committed JSON so builds stay deterministic and CI never shells out to git.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'src/data/track-record.json');

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trimEnd();

function normalizeVerdict(v) {
  return String(v ?? '')
    .replace(/^["']+|["']+$/g, '')
    .trim()
    .toLowerCase();
}

function slugFromPath(path) {
  return basename(path).replace(/\.(yaml|md)$/, '');
}

function splitCommits(output) {
  // Each commit block starts with a 40-char hash followed by a tab.
  return output
    .split(/(?=^[0-9a-f]{40}\t)/m)
    .filter((b) => b.trim().length > 0);
}

/**
 * Parse `git log -p` output for tools or agents and return verdict flips.
 * A flip is one -verdict:X and one +verdict:Y in the same file diff, X != Y.
 */
export function parseFlips(gitOutput, collection) {
  const flips = [];
  for (const block of splitCommits(gitOutput)) {
    const lines = block.split('\n');
    const [hash, date, ...subjectParts] = lines[0].split('\t');
    const subject = subjectParts.join('\t');
    const shortHash = hash.slice(0, 7);

    let currentSlug = null;
    let from = null;
    let to = null;

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      const diffMatch = line.match(/^diff --git a\/(.+?) b\/\1$/);
      if (diffMatch) {
        if (currentSlug && from && to && from !== to) {
          flips.push({ collection, slug: currentSlug, from, to, date, shortHash, subject, hash });
        }
        currentSlug = slugFromPath(diffMatch[1]);
        from = null;
        to = null;
        continue;
      }
      if (!currentSlug) continue;
      if (line.startsWith('-verdict:')) {
        from = normalizeVerdict(line.slice(9));
      } else if (line.startsWith('+verdict:')) {
        to = normalizeVerdict(line.slice(9));
      }
    }

    if (currentSlug && from && to && from !== to) {
      flips.push({ collection, slug: currentSlug, from, to, date, shortHash, subject, hash });
    }
  }
  return flips;
}

/**
 * Parse `git log --diff-filter=A --name-status` output for graveyard additions.
 */
export function parseBurials(gitOutput) {
  const burials = [];
  for (const block of splitCommits(gitOutput)) {
    const lines = block.split('\n');
    const [hash, date, ...subjectParts] = lines[0].split('\t');
    const subject = subjectParts.join('\t');
    const shortHash = hash.slice(0, 7);

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) continue;
      const [status, ...rest] = line.split('\t');
      const path = rest.at(-1);
      if (!path || !path.startsWith('src/content/graveyard/')) continue;
      if (status !== 'A') continue;
      burials.push({ slug: slugFromPath(path), date, shortHash, subject, hash });
    }
  }
  return burials;
}

function loadGraveyardMeta(slug) {
  const path = join(root, 'src/content/graveyard', `${slug}.yaml`);
  if (!existsSync(path)) return { name: slug };
  const doc = yaml.load(readFileSync(path, 'utf8'), { schema: yaml.JSON_SCHEMA });
  return { name: doc.name ?? slug, died: doc.died };
}

export function buildTrackRecord() {
  const toolsOutput = git(
    'log',
    '--reverse',
    '--format=%H%x09%ad%x09%s',
    '--date=short',
    '-p',
    '--',
    'src/content/tools/*.yaml',
  );
  const agentsOutput = git(
    'log',
    '--reverse',
    '--format=%H%x09%ad%x09%s',
    '--date=short',
    '-p',
    '--',
    'src/content/agents/*.yaml',
  );
  const graveyardOutput = git(
    'log',
    '--diff-filter=A',
    '--reverse',
    '--format=%H%x09%ad%x09%s',
    '--date=short',
    '--name-status',
    '--',
    'src/content/graveyard/',
  );

  const flips = [...parseFlips(toolsOutput, 'tools'), ...parseFlips(agentsOutput, 'agents')].sort(
    (a, b) => a.date.localeCompare(b.date) || a.hash.localeCompare(b.hash) || a.slug.localeCompare(b.slug),
  );

  const burials = parseBurials(graveyardOutput)
    .sort((a, b) => a.date.localeCompare(b.date) || a.hash.localeCompare(b.hash) || a.slug.localeCompare(b.slug))
    .map((b) => {
      const meta = loadGraveyardMeta(b.slug);
      const out = { slug: b.slug, name: meta.name, date: b.date, shortHash: b.shortHash, subject: b.subject, hash: b.hash };
      if (meta.died) out.died = meta.died;
      return out;
    });

  return { generated_at: new Date().toISOString(), flips, burials };
}

function main() {
  const record = buildTrackRecord();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`✓ track-record: ${record.flips.length} flip(s), ${record.burials.length} burial(s) → ${OUT}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
