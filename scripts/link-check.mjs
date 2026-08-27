#!/usr/bin/env node
/**
 * Dead-receipt watch — checks every external URL embedded in content files.
 *
 * Runs locally and in CI. Exits 1 only when real dead links are found;
 * flaky results (bot blocks, transient failures) are reported but do not fail.
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const UA = 'NoemiumLinkCheck/1.0 (+https://noemium.com/method/)';
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 8;
const MAX_REDIRECTS = 5;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src', 'content');
const reportsDir = join(root, 'reports');

const HTTPS_URL_RE = /https:\/\/[^\s<>"{}|\\^`\[\]]+/g;

const collections = [
  { name: 'tools', dir: join(contentDir, 'tools'), exts: ['.yaml', '.yml'] },
  { name: 'models', dir: join(contentDir, 'models'), exts: ['.yaml', '.yml'] },
  { name: 'stacks', dir: join(contentDir, 'stacks'), exts: ['.md'] },
  { name: 'agents', dir: join(contentDir, 'agents'), exts: ['.yaml', '.yml'] },
  { name: 'skills', dir: join(contentDir, 'skills'), exts: ['.yaml', '.yml'] },
  { name: 'graveyard', dir: join(contentDir, 'graveyard'), exts: ['.yaml', '.yml'] },
];

function parseFrontmatter(md) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return match ? match[1] : null;
}

function loadEntry(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const opts = { schema: yaml.JSON_SCHEMA, filename: filePath };
  if (filePath.endsWith('.md')) {
    const fm = parseFrontmatter(src);
    if (fm === null) throw new Error('missing frontmatter block');
    return yaml.load(fm, opts);
  }
  return yaml.load(src, opts);
}

function listFiles(dir, exts) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => exts.some((ext) => f.endsWith(ext)))
    .sort()
    .map((f) => join(dir, f));
}

function trimUrl(url) {
  let trimmed = url;
  while (/[;,.:"'\u00BB\u201D\u2019]$/.test(trimmed)) {
    trimmed = trimmed.slice(0, -1);
  }
  if (trimmed.endsWith(')')) {
    const open = (trimmed.match(/\(/g) || []).length;
    const close = (trimmed.match(/\)/g) || []).length;
    if (open < close) trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

function findUrlsInString(text) {
  const raw = String(text).match(HTTPS_URL_RE) || [];
  return Array.from(new Set(raw.map(trimUrl)));
}

function extractUrls(collection, data, file) {
  const out = [];
  const push = (field, url) => {
    if (url) out.push({ file, field, url });
  };

  switch (collection) {
    case 'tools': {
      push('url', data.url);
      if (data.affiliate_url) push('affiliate_url', data.affiliate_url);
      data.receipts?.forEach((u, i) => push(`receipts[${i}]`, u));
      break;
    }
    case 'stacks': {
      data.receipts?.forEach((u, i) => push(`receipts[${i}]`, u));
      break;
    }
    case 'agents': {
      push('url', data.url);
      data.evidence?.forEach((e, i) => push(`evidence[${i}].url`, e.url));
      data.install?.forEach((inst, i) => {
        if (inst.url) push(`install[${i}].url`, inst.url);
      });
      break;
    }
    case 'graveyard': {
      push('url', data.url);
      push('receipt', data.receipt);
      if (data.succeeded_by?.url) push('succeeded_by.url', data.succeeded_by.url);
      break;
    }
    case 'models': {
      findUrlsInString(data.source_attribution).forEach((u) => push('source_attribution', u));
      data.benchmarks?.forEach((b, i) => {
        findUrlsInString(b.source).forEach((u) => push(`benchmarks[${i}].source`, u));
      });
      break;
    }
    default:
      break;
  }

  return out;
}

async function fetchOnce(url, method, redirectCount) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'User-Agent': UA, Accept: '*/*' },
      signal: controller.signal,
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400 && res.headers.has('location')) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw Object.assign(new Error('too many redirects'), { code: 'TOO_MANY_REDIRECTS' });
      }
      const next = new URL(res.headers.get('location'), url).href;
      return fetchOnce(next, method, redirectCount + 1);
    }

    return { status: res.status, finalUrl: url };
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryableError(err) {
  const code = err?.cause?.code || err?.code;
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') return true;
  if (err.name === 'TypeError' && /fetch failed/i.test(err.message)) return true;
  return false;
}

function classifyError(err) {
  const code = err?.cause?.code;
  const message = err?.message || '';

  if (err.name === 'AbortError' || message.includes('timeout') || code === 'ETIMEDOUT') {
    return { status: 'flaky', statusCode: 0, reason: 'timeout' };
  }
  if (code === 'ENOTFOUND' || message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
    return { status: 'dead', statusCode: 0, reason: 'dns failure' };
  }
  if (
    code?.includes('CERT') ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    message.includes('certificate') ||
    message.includes('unable to verify')
  ) {
    return { status: 'dead', statusCode: 0, reason: 'invalid certificate' };
  }
  if (code === 'TOO_MANY_REDIRECTS') {
    return { status: 'flaky', statusCode: 0, reason: 'too many redirects' };
  }
  return { status: 'flaky', statusCode: 0, reason: `network error (${message})` };
}

async function checkUrl(url, attempt = 0) {
  let lastResult = null;

  for (const method of ['HEAD', 'GET']) {
    try {
      const result = await fetchOnce(url, method, 0);
      lastResult = result;

      if (result.status === 405 || result.status === 501) {
        // Method not allowed / not implemented: fall back to GET.
        continue;
      }

      if (result.status >= 200 && result.status < 400) {
        return { status: 'ok', statusCode: result.status, finalUrl: result.finalUrl };
      }
      if ([403, 429, 408].includes(result.status) || result.status >= 500) {
        return { status: 'flaky', statusCode: result.status, finalUrl: result.finalUrl };
      }
      if ([404, 410].includes(result.status)) {
        return { status: 'dead', statusCode: result.status, finalUrl: result.finalUrl };
      }
      return { status: 'dead', statusCode: result.status, finalUrl: result.finalUrl };
    } catch (err) {
      if (method === 'HEAD') {
        // HEAD failed: try GET next, unless it was a method-not-allowed handled above.
        if (lastResult && (lastResult.status === 405 || lastResult.status === 501)) {
          continue;
        }
        continue;
      }

      if (attempt === 0 && isRetryableError(err)) {
        return checkUrl(url, attempt + 1);
      }
      return classifyError(err);
    }
  }

  // If we exhausted both methods and only saw 405/501, the GET loop would have run.
  // This fallback covers unexpected exhaustion.
  if (lastResult) {
    return { status: 'dead', statusCode: lastResult.status, finalUrl: lastResult.finalUrl };
  }
  return { status: 'flaky', statusCode: 0, reason: 'exhausted methods' };
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeMarkdownCell(value) {
  return String(value).replace(/[|]/g, '\\|');
}

function sanitizeIssueText(text) {
  return String(text)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[[\]()`]/g, '');
}

// Collect every URL occurrence.
const occurrences = [];
for (const { name, dir, exts } of collections) {
  for (const filePath of listFiles(dir, exts)) {
    const rel = relative(root, filePath);
    let data;
    try {
      data = loadEntry(filePath);
    } catch (err) {
      console.error(`parse error in ${rel}: ${err.message}`);
      process.exit(1);
    }
    occurrences.push(...extractUrls(name, data, rel));
  }
}

// Deduplicate by URL for checking, then map back to occurrences.
const uniqueUrls = [...new Set(occurrences.map((o) => o.url))];
console.log(`checking ${occurrences.length} URL occurrences (${uniqueUrls.length} unique) ...`);

const urlResults = new Map();
await mapLimit(uniqueUrls, CONCURRENCY, async (url) => {
  const result = await checkUrl(url);
  urlResults.set(url, result);
});

const results = occurrences.map((o) => ({ ...o, ...urlResults.get(o.url) }));
const ok = results.filter((r) => r.status === 'ok');
const flaky = results.filter((r) => r.status === 'flaky');
const dead = results.filter((r) => r.status === 'dead');

const date = today();
const reportPath = join(reportsDir, `link-check-${date}.md`);
mkdirSync(reportsDir, { recursive: true });

const rows = (items) =>
  items
    .map(
      (r) =>
        `| ${sanitizeMarkdownCell(r.file)} | ${sanitizeMarkdownCell(r.field)} | ${sanitizeMarkdownCell(r.url)} | ${r.statusCode || r.reason} |`,
    )
    .join('\n') || '| — | — | — | — |';

const report = `# Link check report — ${date}

## Summary

| Status | Count |
| --- | --- |
| ok | ${ok.length} |
| flaky | ${flaky.length} |
| dead | ${dead.length} |
| **total** | **${results.length}** |

## Dead links

| File | Field | URL | Status |
| --- | --- | --- | --- |
${rows(dead)}

## Flaky links

| File | Field | URL | Status |
| --- | --- | --- | --- |
${rows(flaky)}
`;

writeFileSync(reportPath, report, 'utf8');

console.log(`ok: ${ok.length} · flaky: ${flaky.length} · dead: ${dead.length} · total: ${results.length}`);
console.log(`report: ${relative(root, reportPath)}`);

if (dead.length > 0) {
  console.error(`\n✗ dead links found: ${dead.length}`);
  for (const d of dead) {
    console.error(`  ${d.file} · ${d.field} · ${d.url} · ${d.statusCode || d.reason}`);
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (token && repo) {
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

    const titlePrefix = 'Dead links in catalog';
    const safeDate = sanitizeIssueText(date);
    const title = `${titlePrefix} (${safeDate})`;
    const deadList = dead
      .map((d) => `- \`${sanitizeIssueText(d.file)}\` · ${sanitizeIssueText(d.field)} · ${sanitizeIssueText(d.url)} · ${sanitizeIssueText(String(d.statusCode || d.reason))}`)
      .join('\n');
    const body = [
      `Link check found ${dead.length} dead URL(s):`,
      '',
      deadList,
      '',
      `Report: \`reports/link-check-${safeDate}.md\``,
    ].join('\n');

    const list = await api('/issues?state=open&per_page=100').then((r) => r.json());
    const existing = (Array.isArray(list) ? list : []).find((i) =>
      String(i.title).startsWith(titlePrefix),
    );

    if (existing) {
      const res = await api(`/issues/${existing.number}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      if (res.ok) console.log(`commented on issue #${existing.number}`);
      else console.error(`failed to comment on issue #${existing.number}: ${res.status}`);
    } else {
      const res = await api('/issues', {
        method: 'POST',
        body: JSON.stringify({ title, body, labels: ['dead-links'] }),
      });
      if (res.ok) console.log(`opened issue: ${title}`);
      else console.error(`failed to open issue: ${res.status}`);
    }
  }

  process.exit(1);
}

console.log('✓ no dead links');
process.exit(0);
