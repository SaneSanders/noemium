#!/usr/bin/env node
/**
 * Noemium content validator (CI-friendly, no Astro build required).
 *
 * Validates every entry in src/content/{tools,stacks,models} against the
 * shared zod schemas in src/content-schemas.ts, plus repo policy checks:
 *   - affiliate policy: referral patterns (?ref=, ?via=, ?aff=, utm_*,
 *     /ref/, getrewardful, partnerstack, dub.co, firstpromoter) are forbidden
 *     in `url` and `receipts` on ALL tools — referral links live only in
 *     `affiliate_url` (schema enforces affiliate: declared pairing)
 *   - `last_verified` must not be in the future; >90 days old is a warning
 *   - file slugs must be kebab-case
 *   - cross-references: stacks.tools and tools.models_used must resolve
 *
 * Exit code 1 on any error; warnings never fail the run.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');

/**
 * Load the shared schemas. Modern Node (>=22.18 / >=23.6) strips TS types
 * natively; on older runtimes fall back to a one-off transpile with the
 * TypeScript compiler that is already a devDependency.
 */
async function loadSchemas() {
  const tsPath = path.join(ROOT, 'src', 'content-schemas.ts');
  try {
    return await import(tsPath);
  } catch {
    const { createRequire } = await import('node:module');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const ts = createRequire(import.meta.url)('typescript');
    const js = ts.transpileModule(readFileSync(tsPath, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const tmp = path.join(ROOT, 'node_modules', '.cache', 'content-schemas.transpiled.mjs');
    mkdirSync(path.dirname(tmp), { recursive: true });
    writeFileSync(tmp, js);
    return import(tmp);
  }
}

const AFFILIATE_PARAMS = ['ref', 'via', 'aff'];
const REFERRAL_SUBSTRINGS = ['/ref/', 'getrewardful', 'partnerstack', 'dub.co', 'firstpromoter'];
const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const STALE_DAYS = 90;

const errors = [];
const warnings = [];

function fail(file, msg) {
  errors.push(`${file}: ${msg}`);
}
function warn(file, msg) {
  warnings.push(`${file}: ${msg}`);
}

function parseFrontmatter(md) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  return match[1];
}

function loadEntry(filePath) {
  const src = readFileSync(filePath, 'utf8');
  // JSON_SCHEMA keeps scalars (e.g. dates) as strings instead of coercing
  // them to Date objects, matching what zod expects.
  const opts = { schema: yaml.JSON_SCHEMA, filename: filePath };
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    return yaml.load(src, opts);
  }
  if (filePath.endsWith('.md')) {
    const fm = parseFrontmatter(src);
    if (fm === null) throw new Error('missing frontmatter block');
    return yaml.load(fm, opts);
  }
  throw new Error(`unsupported content file type: ${filePath}`);
}

function listFiles(dir, extensions) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => extensions.some((ext) => f.endsWith(ext)))
    .sort()
    .map((f) => path.join(dir, f));
}

function hasTrackingParams(rawUrl) {
  try {
    const u = new URL(rawUrl);
    for (const key of u.searchParams.keys()) {
      if (AFFILIATE_PARAMS.includes(key) || key.startsWith('utm_')) return `?${key}=`;
    }
  } catch {
    // Non-absolute URLs are already rejected by the zod schema.
  }
  return null;
}

/**
 * Referral/affiliate patterns must never appear in `url` or `receipts` —
 * those stay clean and canonical. Referral links belong in `affiliate_url`.
 * Returns the matched pattern or null.
 */
function findReferralPattern(rawUrl) {
  const param = hasTrackingParams(rawUrl);
  if (param) return param;
  const lower = rawUrl.toLowerCase();
  return REFERRAL_SUBSTRINGS.find((p) => lower.includes(p)) ?? null;
}

function checkDate(file, value) {
  const date = new Date(`${value}T00:00:00Z`);
  const now = new Date();
  if (date.getTime() > now.getTime()) {
    fail(file, `last_verified ${value} is in the future`);
    return;
  }
  const ageDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (ageDays > STALE_DAYS) {
    warn(file, `last_verified ${value} is ${Math.floor(ageDays)} days old (>${STALE_DAYS}) — consider re-verifying`);
  }
}

function formatZodIssues(error) {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

const { toolSchema, stackSchema, modelSchema, graveyardSchema, agentSchema, jobSchema } = await loadSchemas();

const collections = [
  { name: 'tools', dir: path.join(CONTENT_DIR, 'tools'), exts: ['.yaml', '.yml'], schema: toolSchema },
  { name: 'stacks', dir: path.join(CONTENT_DIR, 'stacks'), exts: ['.md'], schema: stackSchema },
  { name: 'models', dir: path.join(CONTENT_DIR, 'models'), exts: ['.yaml', '.yml'], schema: modelSchema },
  { name: 'graveyard', dir: path.join(CONTENT_DIR, 'graveyard'), exts: ['.yaml', '.yml'], schema: graveyardSchema },
  { name: 'agents', dir: path.join(CONTENT_DIR, 'agents'), exts: ['.yaml', '.yml'], schema: agentSchema },
  { name: 'jobs', dir: path.join(CONTENT_DIR, 'jobs'), exts: ['.yaml', '.yml'], schema: jobSchema },
];

// URL fields that must stay referral-free per collection.
const cleanUrlFields = {
  tools: (d) => [d.url, ...d.receipts],
  graveyard: (d) => [
    d.url,
    d.receipt,
    ...('url' in (d.succeeded_by ?? {}) && d.succeeded_by.url ? [d.succeeded_by.url] : []),
  ],
  agents: (d) => [
    d.url,
    ...d.evidence.map((item) => item.url),
    ...(d.install ?? []).flatMap((method) => (method.url ? [method.url] : [])),
  ],
};

// Every URL field, across every collection — also checked for homographs,
// IP literals, userinfo, and known shorteners/redirectors.
const allUrlFields = {
  tools: (d) => [
    ['url', d.url],
    ...(d.affiliate_url ? [['affiliate_url', d.affiliate_url]] : []),
    ...d.receipts.map((u) => ['receipts', u]),
  ],
  stacks: (d) => d.receipts.map((u) => ['receipts', u]),
  models: () => [],
  graveyard: (d) => [
    ['url', d.url],
    ['receipt', d.receipt],
    ...('url' in (d.succeeded_by ?? {}) && d.succeeded_by.url ? [['succeeded_by.url', d.succeeded_by.url]] : []),
  ],
  agents: (d) => [
    ['url', d.url],
    ...d.evidence.map((item) => ['evidence.url', item.url]),
    ...(d.install ?? []).flatMap((method) => (method.url ? [['install.url', method.url]] : [])),
  ],
};

const SHORTENER_HOSTS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'rb.gy',
  'cutt.ly',
  'shorturl.at',
  'tiny.cc',
]);

const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function looksLikeIp(host) {
  return host.startsWith('[') || IPV4_RE.test(host);
}

function isSuspiciousHost(host) {
  const lower = host.toLowerCase();
  if (lower.includes('xn--') || /[^\x00-\x7F]/.test(lower)) return 'punycode/non-ASCII hostname';
  if (looksLikeIp(lower)) return 'IP-literal hostname';
  if (SHORTENER_HOSTS.has(lower)) return 'shortener/redirector hostname';
  return null;
}

function checkUrlSecurity(file, field, rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.username || u.password) {
      fail(file, `${field} contains userinfo — URLs must not embed credentials: "${rawUrl}"`);
      return;
    }
    const reason = isSuspiciousHost(u.hostname);
    if (reason) {
      fail(file, `${field} uses ${reason}: "${rawUrl}"`);
    }
  } catch {
    // Invalid URLs are already rejected by the zod schema.
  }
}

/** @type {Record<string, Map<string, any>>} collection name -> slug -> data */
const entries = {};
let checked = 0;

for (const { name, dir, exts, schema } of collections) {
  entries[name] = new Map();
  for (const filePath of listFiles(dir, exts)) {
    const rel = path.relative(ROOT, filePath);
    const slug = path.basename(filePath).replace(/\.(yaml|yml|md)$/, '');

    if (!KEBAB_RE.test(slug)) {
      fail(rel, `slug "${slug}" is not kebab-case`);
    }

    let data;
    try {
      data = loadEntry(filePath);
    } catch (err) {
      fail(rel, `parse error: ${err.message}`);
      continue;
    }

    const result = schema.safeParse(data);
    if (!result.success) {
      fail(rel, `schema: ${formatZodIssues(result.error)}`);
      continue;
    }

    entries[name].set(slug, result.data);
    checked += 1;
    checkDate(rel, result.data.last_verified);

    if (name === 'tools' && result.data.verdict === 'ship' && !result.data.test_run) {
      warn(rel, 'ship verdict without a published test_run protocol');
    }

    const urlFields = cleanUrlFields[name];
    if (urlFields) {
      for (const u of urlFields(result.data)) {
        const pattern = findReferralPattern(u);
        if (pattern) {
          fail(rel, `referral pattern "${pattern}" in "${u}" — url/receipts must stay clean; referral links belong in affiliate_url`);
        }
      }
    }

    const securityFields = allUrlFields[name];
    if (securityFields) {
      for (const [field, u] of securityFields(result.data)) {
        checkUrlSecurity(rel, field, u);
      }
    }
  }
}

// Cross-reference checks.
for (const [slug, tool] of entries.tools) {
  for (const modelSlug of tool.models_used ?? []) {
    if (!entries.models.has(modelSlug)) {
      fail(`src/content/tools/${slug}.yaml`, `models_used references unknown model "${modelSlug}"`);
    }
  }
}
for (const [slug, stack] of entries.stacks) {
  for (const toolSlug of stack.tools) {
    if (!entries.tools.has(toolSlug)) {
      fail(`src/content/stacks/${slug}.md`, `tools references unknown tool "${toolSlug}"`);
    }
  }
  if (stack.budget) {
    for (const toolSlug of stack.budget.tools) {
      if (!entries.tools.has(toolSlug)) {
        fail(`src/content/stacks/${slug}.md`, `budget.tools references unknown tool "${toolSlug}"`);
      }
    }
  }
  if (stack.twin) {
    if (stack.twin.slug === slug) {
      fail(`src/content/stacks/${slug}.md`, `twin.slug cannot point at itself`);
    } else if (!entries.stacks.has(stack.twin.slug)) {
      fail(`src/content/stacks/${slug}.md`, `twin.slug references unknown stack "${stack.twin.slug}"`);
    } else {
      const other = entries.stacks.get(stack.twin.slug);
      if (stack.twin.kind === 'shoestring' && other.monthly_cost_usd > stack.monthly_cost_usd) {
        fail(
          `src/content/stacks/${slug}.md`,
          `twin.kind is shoestring but ${stack.twin.slug} costs more ($${other.monthly_cost_usd} > $${stack.monthly_cost_usd})`,
        );
      }
      if (stack.twin.kind === 'studio' && other.monthly_cost_usd < stack.monthly_cost_usd) {
        fail(
          `src/content/stacks/${slug}.md`,
          `twin.kind is studio but ${stack.twin.slug} costs less ($${other.monthly_cost_usd} < $${stack.monthly_cost_usd})`,
        );
      }
    }
  }
}
for (const [slug, grave] of entries.graveyard) {
  if (!('none' in grave.succeeded_by) && grave.succeeded_by.slug && !entries.tools.has(grave.succeeded_by.slug)) {
    fail(
      `src/content/graveyard/${slug}.yaml`,
      `succeeded_by.slug references unknown tool "${grave.succeeded_by.slug}"`,
    );
  }
}

for (const [slug, model] of entries.models) {
  if (model.retiring?.successor && !entries.models.has(model.retiring.successor)) {
    fail(
      `src/content/models/${slug}.yaml`,
      `retiring.successor references unknown model "${model.retiring.successor}"`,
    );
  }
}

for (const [slug, job] of entries.jobs) {
  const recommended = job.picks.filter((p) => p.role === 'recommended');
  if (recommended.length !== 1) {
    fail(`src/content/jobs/${slug}.yaml`, `expected exactly one recommended pick, found ${recommended.length}`);
  }
  for (const pick of job.picks) {
    if (!entries.tools.has(pick.tool)) {
      fail(`src/content/jobs/${slug}.yaml`, `picks references unknown tool "${pick.tool}"`);
    }
  }
}

// Report.
for (const w of warnings) console.warn(`WARN  ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`ERROR ${e}`);
  console.error(`\n✗ validation failed: ${errors.length} error(s), ${warnings.length} warning(s), ${checked} entries checked`);
  process.exit(1);
}
console.log(`✓ content valid: ${checked} entries checked (${Object.entries(entries).map(([n, m]) => `${m.size} ${n}`).join(', ')}), ${warnings.length} warning(s)`);
