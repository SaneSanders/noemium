import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyRssTitle,
  compareModelPrices,
  deriveGithubTargets,
  formatBrief,
  freshnessFindings,
  interpretGithubRelease,
  interpretGithubRepo,
  interpretStatus,
  isNotableProductTag,
  isProductReleaseTag,
  loadSources,
  parseFeed,
  parseGithubRepo,
  pickProductRelease,
  runHarvest,
  summarize,
} from '../scripts/lib/harvest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('parseGithubRepo keeps owner/repo and drops marketing paths', () => {
  assert.deepEqual(parseGithubRepo('https://github.com/cline/cline'), { owner: 'cline', repo: 'cline' });
  assert.deepEqual(parseGithubRepo('https://github.com/n8n-io/n8n/blob/master/README.md'), {
    owner: 'n8n-io',
    repo: 'n8n',
  });
  assert.equal(parseGithubRepo('https://github.com/features/copilot'), null);
  assert.equal(parseGithubRepo('https://github.com/CodeGeeX'), null);
  assert.equal(parseGithubRepo('https://docs.github.com/en/copilot'), null);
  assert.equal(parseGithubRepo('https://cursor.com'), null);
});

test('interpretStatus is silent when operational and alerts on major', () => {
  const page = { id: 'openai', name: 'OpenAI', url: 'https://status.openai.com/api/v2/status.json', related: ['chatgpt'] };
  assert.equal(interpretStatus({ status: { indicator: 'none', description: 'All Systems Operational' } }, page), null);
  const minor = interpretStatus({ status: { indicator: 'minor', description: 'Elevated errors' } }, page);
  assert.equal(minor.severity, 'warn');
  assert.equal(minor.kind, 'status');
  assert.equal(minor.slug, null);
  const major = interpretStatus({ status: { indicator: 'major', description: 'Outage' } }, page);
  assert.equal(major.severity, 'alert');
  assert.match(major.message, /Outage/);
});

test('interpretStatus names the incident and components, not a catalog slug', () => {
  const page = {
    id: 'cloudflare',
    name: 'Cloudflare',
    url: 'https://www.cloudflarestatus.com/api/v2/status.json',
    related: ['cloudflare-vibesdk'],
  };
  const finding = interpretStatus(
    {
      status: { indicator: 'minor', description: 'Minor Service Outage' },
      incidents: [{ name: 'Increased Latency', components: [{ name: 'CDN/Cache' }] }],
    },
    page,
  );
  assert.equal(finding.slug, null);
  assert.match(finding.message, /Increased Latency/);
  assert.match(finding.message, /CDN\/Cache/);
  assert.doesNotMatch(finding.message, /vibesdk/);
});

test('parseFeed keeps items after since and upgrades pricing titles to warn', () => {
  const rss = `<?xml version="1.0"?>
  <rss version="2.0"><channel>
    <item>
      <title><![CDATA[Price increase for API]]></title>
      <link>https://example.com/a</link>
      <pubDate>Mon, 24 Aug 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Old news</title>
      <link>https://example.com/old</link>
      <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
    </item>
  </channel></rss>`;
  const source = { id: 'ex', name: 'Example', url: 'https://example.com/rss.xml', related: [] };
  const items = parseFeed(rss, { source, since: '2026-08-20' });
  assert.equal(items.length, 1);
  assert.equal(items[0].severity, 'warn');
  assert.equal(items[0].kind, 'rss');
  assert.equal(items[0].url, 'https://example.com/a');
});

test('parseFeed reads Atom entries', () => {
  const atom = `<?xml version="1.0"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <title>Introducing Ship</title>
      <link rel="alternate" href="https://example.com/atom"/>
      <updated>2026-08-24T10:00:00Z</updated>
    </entry>
  </feed>`;
  const items = parseFeed(atom, {
    source: { id: 'atom', name: 'Atom', url: 'https://example.com/atom.xml', related: [] },
    since: '2026-08-01',
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].severity, 'info');
  assert.equal(items[0].url, 'https://example.com/atom');
});

test('parseFeed drops customer stories', () => {
  const rss = `<?xml version="1.0"?>
  <rss version="2.0"><channel>
    <item>
      <title>Stampli cuts launch hours by 68% using ChatGPT Work</title>
      <link>https://example.com/stampli</link>
      <pubDate>Mon, 24 Aug 2026 12:00:00 GMT</pubDate>
    </item>
  </channel></rss>`;
  const items = parseFeed(rss, {
    source: { id: 'ex', name: 'Example', url: 'https://example.com/rss.xml', related: [] },
    since: '2026-08-20',
  });
  assert.equal(items.length, 0);
});

test('classifyRssTitle keeps product news and drops tutorials', () => {
  assert.equal(classifyRssTitle('Price increase for API'), 'warn');
  assert.equal(classifyRssTitle('Offering Zero Data Retention for frontier models'), 'warn');
  assert.equal(classifyRssTitle('Introducing AI Futures'), 'info');
  assert.equal(classifyRssTitle('ChatGPT Ads expands across Europe'), 'info');
  assert.equal(classifyRssTitle('Advancing price-performance for developers with GPT-5.6 in Kiro'), 'info');
  assert.equal(classifyRssTitle('Advancing price-performance for developers with GPT‑5.6 in Kiro'), 'info');
  assert.equal(classifyRssTitle('Replit expands access to software creation with GPT-5.6 Luna'), null);
  assert.equal(classifyRssTitle('GitHub Copilot app for Beginners: Managing your work'), null);
  assert.equal(classifyRssTitle('5 new ways to level up your learning with Search'), null);
  assert.equal(classifyRssTitle('Stampli cuts launch hours by 68% using ChatGPT Work'), null);
  assert.equal(classifyRssTitle('How NVIDIA scales expertise with ChatGPT Work'), null);
});

test('isProductReleaseTag drops scoped npm tags and keeps product versions', () => {
  assert.equal(isProductReleaseTag('@assistant-ui/react-streamdown@0.3.11'), false);
  assert.equal(isProductReleaseTag('@ai-sdk/xai@4.0.44'), false);
  assert.equal(isProductReleaseTag('mem0-strands-v0.1.0'), false);
  assert.equal(isProductReleaseTag('create-assistant-ui@0.0.75', { repo: 'assistant-ui', slug: 'assistant-ui' }), false);
  assert.equal(isProductReleaseTag('n8n@2.35.7', { repo: 'n8n', slug: 'n8n' }), true);
  assert.equal(isProductReleaseTag('shadcn@4.19.0', { repo: 'ui', slug: 'shadcn-ui' }), true);
  assert.equal(isProductReleaseTag('e2b@2.45.0', { repo: 'E2B', slug: 'e2b' }), true);
  assert.equal(isProductReleaseTag('ai@7.0.79', { repo: 'ai', slug: 'vercel-ai-sdk' }), true);
  assert.equal(isProductReleaseTag('v2.1.245'), true);
  assert.equal(isProductReleaseTag('1.15.17'), true);
  assert.equal(isNotableProductTag('v2.1.245'), false);
  assert.equal(isNotableProductTag('n8n@2.35.7', { repo: 'n8n' }), false);
  assert.equal(isNotableProductTag('v2.3.0'), true);
  assert.equal(isNotableProductTag('shadcn@4.19.0', { slug: 'shadcn-ui' }), true);
  assert.equal(isNotableProductTag('ai@7.0.79', { repo: 'ai' }), false);
});

test('pickProductRelease skips package tags to the next product version', () => {
  const target = { slug: 'ai-sdk', name: 'Vercel AI SDK', last_verified: '2026-08-19' };
  const picked = pickProductRelease(
    [
      { tag_name: '@ai-sdk/xai@4.0.44', published_at: '2026-08-25T00:00:00Z', prerelease: false },
      { tag_name: 'ai@6.0.0', published_at: '2026-08-24T00:00:00Z', prerelease: false, html_url: 'https://example.com/ai' },
    ],
    target,
  );
  assert.equal(picked.tag_name, 'ai@6.0.0');
  assert.equal(pickProductRelease([{ tag_name: '@ai-sdk/xai@4.0.44', published_at: '2026-08-25T00:00:00Z' }], target), null);
});

test('compareModelPrices reports drift and ignores media / unmapped', () => {
  const findings = compareModelPrices(
    [
      { slug: 'claude-sonnet-5', name: 'Claude Sonnet 5', price_input_per_mtok: 2, price_output_per_mtok: 10, context_window: 200000 },
      { slug: 'eleven-v3', name: 'Eleven v3', price_unit: 'character', price_amount: 0.0001, price_input_per_mtok: 0, price_output_per_mtok: 0 },
      { slug: 'mystery', name: 'Mystery', price_input_per_mtok: 1, price_output_per_mtok: 2 },
    ],
    { 'claude-sonnet-5': { input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 1000000 } },
    { data: [] },
    [{ slug: 'claude-sonnet-5', litellm: ['claude-sonnet-5'] }],
  );
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.slug === 'claude-sonnet-5'));
  assert.ok(findings.some((f) => f.kind === 'price_drift'));
  assert.ok(findings.some((f) => f.kind === 'context_drift'));
  assert.ok(findings.every((f) => f.severity === 'warn' || f.severity === 'alert'));
});

test('context_override suppresses LiteLLM context drift', () => {
  const findings = compareModelPrices(
    [{ slug: 'x', name: 'X', price_input_per_mtok: 2, price_output_per_mtok: 10, context_window: 400000 }],
    { 'x-key': { input_cost_per_token: 0.000002, output_cost_per_token: 0.00001, max_input_tokens: 272000 } },
    { data: [] },
    [{ slug: 'x', litellm: ['x-key'], context_override: 400000 }],
  );
  assert.equal(findings.length, 0);
});

test('compareModelPrices is silent within float noise', () => {
  const findings = compareModelPrices(
    [{ slug: 'x', name: 'X', price_input_per_mtok: 2, price_output_per_mtok: 10, context_window: 1000000 }],
    { 'x-key': { input_cost_per_token: 0.000002, output_cost_per_token: 0.00001, max_input_tokens: 1000000 } },
    { data: [] },
    [{ slug: 'x', litellm: ['x-key'] }],
  );
  assert.equal(findings.length, 0);
});

test('freshnessFindings flags cards older than the window', () => {
  const findings = freshnessFindings(
    [
      { slug: 'old', name: 'Old', collection: 'tools', last_verified: '2026-06-01' },
      { slug: 'fresh', name: 'Fresh', collection: 'tools', last_verified: '2026-08-20' },
    ],
    { staleDays: 60, now: new Date('2026-08-25T00:00:00Z') },
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].slug, 'old');
  assert.equal(findings[0].kind, 'stale');
  assert.equal(findings[0].severity, 'warn');
});

test('interpretGithubRepo alerts when archived or missing', () => {
  const target = { slug: 'n8n', name: 'n8n', owner: 'n8n-io', repo: 'n8n', last_verified: '2026-08-01' };
  const archived = interpretGithubRepo({ archived: true, html_url: 'https://github.com/n8n-io/n8n', full_name: 'n8n-io/n8n' }, target);
  assert.equal(archived[0].severity, 'alert');
  assert.equal(archived[0].kind, 'github_archived');
  const missing = interpretGithubRepo(null, target, { status: 404 });
  assert.equal(missing[0].kind, 'github_missing');
  assert.equal(interpretGithubRepo({ archived: false, html_url: 'https://github.com/n8n-io/n8n' }, target).length, 0);
});

test('interpretGithubRelease is info when published after last_verified', () => {
  const target = { slug: 'cline', name: 'Cline', owner: 'cline', repo: 'cline', last_verified: '2026-08-01' };
  const findings = interpretGithubRelease(
    { tag_name: 'v3.0.0', published_at: '2026-08-20T00:00:00Z', html_url: 'https://github.com/cline/cline/releases/tag/v3.0.0', prerelease: false },
    target,
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'github_release');
  assert.equal(findings[0].severity, 'info');
  assert.equal(
    interpretGithubRelease({ tag_name: 'v2', published_at: '2026-07-01T00:00:00Z', html_url: 'https://example.com', prerelease: false }, target)
      .length,
    0,
  );
});

test('deriveGithubTargets prefers overrides and first real repo', () => {
  const sources = loadSources(`
version: 1
github:
  derive_from_catalog: true
  overrides:
    - slug: cursor
      repo: getcursor/cursor
`);
  const targets = deriveGithubTargets(
    [
      { slug: 'cursor', name: 'Cursor', collection: 'tools', url: 'https://cursor.com', receipts: ['https://cursor.com/pricing'], last_verified: '2026-08-24' },
      { slug: 'cline', name: 'Cline', collection: 'tools', url: 'https://cline.bot', receipts: ['https://github.com/cline/cline'], last_verified: '2026-08-24' },
    ],
    sources,
  );
  assert.deepEqual(
    targets.map((t) => `${t.slug}:${t.owner}/${t.repo}`).sort(),
    ['cline:cline/cline', 'cursor:getcursor/cursor'],
  );
});

test('formatBrief leads with counts and does not propose last_verified bumps', () => {
  const report = {
    generated_at: '2026-08-25T10:00:00.000Z',
    since: '2026-08-18',
    kinds_ran: ['status', 'freshness'],
    stats: { status_pages: 1, stale: 1 },
    findings: [
      { kind: 'status', severity: 'alert', name: 'OpenAI', message: 'major outage', url: 'https://status.openai.com/' },
      { kind: 'stale', severity: 'warn', slug: 'old', name: 'Old', message: 'verified 80d ago' },
    ],
    errors: [],
  };
  const md = formatBrief(report);
  assert.match(md, /1 alert · 1 warn · 0 info/);
  assert.match(md, /major outage/);
  assert.doesNotMatch(md, /bump last_verified/);
  assert.match(md, /Judgement is a content PR/);
});

test('summarize counts severities', () => {
  const s = summarize([
    { severity: 'alert' },
    { severity: 'warn' },
    { severity: 'warn' },
    { severity: 'info' },
  ]);
  assert.deepEqual(s, { alert: 1, warn: 2, info: 1 });
});

test('committed harvest-sources.yaml loads and related slugs exist', () => {
  const text = readFileSync(join(ROOT, 'src/data/harvest-sources.yaml'), 'utf8');
  const sources = loadSources(text);
  assert.equal(sources.version, 1);
  assert.ok(sources.status_pages.length >= 5);
  const slugs = new Set();
  for (const dir of ['tools', 'agents', 'models', 'graveyard']) {
    for (const f of readdirSync(join(ROOT, 'src/content', dir))) {
      slugs.add(f.replace(/\.(yaml|yml|md)$/, ''));
    }
  }
  for (const page of sources.status_pages) {
    for (const slug of page.related ?? []) {
      assert.ok(slugs.has(slug), `status ${page.id} related slug missing: ${slug}`);
    }
  }
  for (const feed of sources.rss) {
    for (const slug of feed.related ?? []) {
      assert.ok(slugs.has(slug), `rss ${feed.id} related slug missing: ${slug}`);
    }
  }
  for (const row of sources.models.match) {
    assert.ok(slugs.has(row.slug), `model match missing from catalog: ${row.slug}`);
  }
});

test('runHarvest observes only: findings, no catalog writes, injectable fetch', async () => {
  const sources = loadSources(`
version: 1
kinds:
  github: false
  rss: false
  models: false
  freshness: true
  status: true
stale_days: 60
status_pages:
  - id: cf
    name: Cloudflare
    url: https://www.cloudflarestatus.com/api/v2/status.json
    related: []
`);
  const catalog = {
    tools: [{ slug: 'old', name: 'Old', url: 'https://example.com', receipts: [], last_verified: '2026-05-01', collection: 'tools' }],
    agents: [],
    models: [],
    graveyard: [],
  };
  const fetches = [];
  const report = await runHarvest({
    sources,
    catalog,
    now: new Date('2026-08-25T00:00:00Z'),
    fetchImpl: async (url) => {
      fetches.push(url);
      if (String(url).includes('incidents')) {
        return new Response(JSON.stringify({ incidents: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ status: { indicator: 'minor', description: 'Blip' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  assert.equal(report.findings.some((f) => f.kind === 'status' && !f.slug), true);
  assert.equal(report.findings.some((f) => f.kind === 'stale' && f.slug === 'old'), true);
  assert.equal(fetches.length, 2);
  assert.equal(report.patches, undefined);
});
