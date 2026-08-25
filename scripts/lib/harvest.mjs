/**
 * Harvest — observe the world, never patch the catalog.
 *
 * Deterministic collectors (statuspage, RSS, GitHub, model prices, freshness)
 * produce findings. Verdicts and last_verified stay human. GitHub Actions
 * may run this; paid keys and judgement stay local.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';

export const UA = 'NoemiumHarvest/1.0 (+https://noemium.com/method/)';
export const KINDS = ['github', 'status', 'rss', 'models', 'freshness'];
const GITHUB_SKIP_OWNERS = new Set([
  'features',
  'topics',
  'orgs',
  'sponsors',
  'settings',
  'marketplace',
  'collections',
  'events',
  'about',
  'pricing',
  'enterprise',
  'security',
  'login',
  'join',
  'apps',
  'solutions',
  'resources',
  'customer-stories',
  'readme',
  'git-guides',
  'github',
]);
const RELEASE_WARN = /deprecat|sunset|discontinu|retired|retiring/i;
const INFO_CAP = 40;
const FEED_CAP = 25;
const FETCH_MS = 15_000;
const POOL = 4;

export function parseGithubRepo(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') return null;
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  if (GITHUB_SKIP_OWNERS.has(parts[0].toLowerCase())) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, '');
  if (['issues', 'pulls', 'actions', 'projects', 'wiki'].includes(repo)) return null;
  return { owner, repo };
}

function packageMatchesTarget(pkg, target = {}) {
  const p = pkg.toLowerCase();
  const r = String(target.repo ?? '').toLowerCase();
  const s = String(target.slug ?? '').toLowerCase();
  if (p === r || p === s) return true;
  if (s.startsWith(`${p}-`)) return true;
  return false;
}

export function isProductReleaseTag(tag, target = {}) {
  if (!tag || tag.startsWith('@')) return false;
  const named = tag.match(/^([A-Za-z0-9._-]+)@v?\d+\.\d+/);
  if (named) return packageMatchesTarget(named[1], target);
  if (/^v?\d+\.\d+/.test(tag)) return true;
  return false;
}

/** Patch trains (v1.2.3, v1.2.17) are not catalog events. Minor/major (.0) are. */
export function isNotableProductTag(tag, target = {}) {
  if (!isProductReleaseTag(tag, target)) return false;
  const m = String(tag).match(/v?(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m || m[3] == null) return true;
  return Number(m[3]) === 0;
}

export function pickProductRelease(releases, target) {
  const list = Array.isArray(releases) ? releases : [];
  for (const release of list) {
    if (!release || release.draft || release.prerelease) continue;
    if (!isNotableProductTag(release.tag_name, target)) continue;
    const published = release.published_at?.slice(0, 10);
    if (!published || !target.last_verified) continue;
    if (published <= target.last_verified) continue;
    return release;
  }
  return null;
}

export function classifyRssTitle(title) {
  const t = String(title ?? '').trim();
  if (!t) return null;
  if (
    /using chatgpt work|case study|partnering with|for beginners|back to school|scales expertise|cleared \d|cuts launch hours|\bcuts \d|expands access/i.test(
      t,
    )
  ) {
    return null;
  }
  if (
    /deprecat|sunset|discontinu|shutting down|shut down|price (cut|reduction|increase)|zero data retention|\bretired\b|\bretiring\b/i.test(
      t,
    )
  ) {
    return 'warn';
  }
  if (/^introduc|^announc|chatgpt ads|chatgpt for teens|gpt.{0,3}\d|now available/i.test(t)) {
    return 'info';
  }
  return null;
}

export function loadSources(text) {
  const raw = yaml.load(text, { schema: yaml.JSON_SCHEMA }) ?? {};
  if (raw.version !== 1) throw new Error('harvest-sources.yaml: version must be 1');
  const kinds = { ...Object.fromEntries(KINDS.map((k) => [k, true])), ...(raw.kinds ?? {}) };
  return {
    version: 1,
    stale_days: raw.stale_days ?? 60,
    rss_lookback_days: raw.rss_lookback_days ?? 7,
    kinds,
    status_pages: raw.status_pages ?? [],
    rss: raw.rss ?? [],
    models: {
      sources: raw.models?.sources ?? {
        helicone: 'https://www.helicone.ai/api/llm-costs',
        litellm: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
      },
      match: raw.models?.match ?? [],
    },
    github: {
      derive_from_catalog: raw.github?.derive_from_catalog !== false,
      overrides: raw.github?.overrides ?? [],
    },
  };
}

export function loadCatalog(root) {
  const loadDir = (name) => {
    const dir = join(root, 'src/content', name);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .sort()
      .map((f) => {
        const data = yaml.load(readFileSync(join(dir, f), 'utf8'), { schema: yaml.JSON_SCHEMA, filename: f });
        return { ...data, slug: f.replace(/\.ya?ml$/, ''), collection: name };
      });
  };
  return {
    tools: loadDir('tools'),
    agents: loadDir('agents'),
    models: loadDir('models'),
    graveyard: loadDir('graveyard'),
  };
}

function urlsOf(entry) {
  const out = [];
  if (entry.url) out.push(entry.url);
  for (const u of entry.receipts ?? []) out.push(u);
  if (entry.receipt) out.push(entry.receipt);
  for (const e of entry.evidence ?? []) if (e?.url) out.push(e.url);
  for (const inst of entry.install ?? []) if (inst?.url) out.push(inst.url);
  return out;
}

export function deriveGithubTargets(entries, sources) {
  const bySlug = new Map();
  if (sources.github.derive_from_catalog) {
    for (const entry of entries) {
      for (const url of urlsOf(entry)) {
        const parsed = parseGithubRepo(url);
        if (!parsed) continue;
        bySlug.set(entry.slug, {
          slug: entry.slug,
          name: entry.name ?? entry.slug,
          collection: entry.collection,
          last_verified: entry.last_verified,
          ...parsed,
        });
        break;
      }
    }
  }
  for (const row of sources.github.overrides) {
    const [owner, repo] = String(row.repo ?? '').split('/');
    if (!owner || !repo) continue;
    const entry = entries.find((e) => e.slug === row.slug);
    bySlug.set(row.slug, {
      slug: row.slug,
      name: entry?.name ?? row.slug,
      collection: entry?.collection,
      last_verified: entry?.last_verified,
      owner,
      repo,
    });
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function interpretStatus(json, page) {
  const indicator = json?.status?.indicator;
  const description = json?.status?.description ?? '';
  if (!indicator || indicator === 'none') return null;
  const severity = indicator === 'major' || indicator === 'critical' ? 'alert' : 'warn';
  const incidents = Array.isArray(json.incidents) ? json.incidents : [];
  const names = incidents.map((item) => item.name).filter(Boolean);
  const components = [
    ...new Set(incidents.flatMap((item) => (item.components ?? []).map((c) => c.name).filter(Boolean))),
  ];
  const detail = names.length ? names.join('; ') : description || indicator;
  const where = components.length ? ` [${components.join(', ')}]` : '';
  return {
    kind: 'status',
    severity,
    source_id: page.id,
    name: page.name,
    slug: null,
    slugs: page.related ?? [],
    message: `${page.name} status: ${detail}${where}`,
    observed: { indicator, description, incidents: names, components },
    url: String(page.url).replace(/\/api\/v2\/(?:status|summary)\.json$/, '/'),
  };
}

function tagText(block, tag) {
  const cdata = block.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i'));
  if (cdata) return cdata[1].trim();
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').trim();
}

function entryLink(block) {
  const alt =
    block.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)/i) ||
    block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i);
  if (alt) return alt[1];
  const href = block.match(/<link\b[^>]*href=["']([^"']+)/i);
  if (href) return href[1];
  return tagText(block, 'link');
}

function entryDate(block) {
  const raw = tagText(block, 'pubDate') || tagText(block, 'published') || tagText(block, 'updated') || tagText(block, 'dc:date');
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : t;
}

export function parseFeed(xml, { source, since }) {
  const chunks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  const sinceMs = Date.parse(`${since}T00:00:00Z`);
  const findings = [];
  for (const block of chunks) {
    const t = entryDate(block);
    if (t == null || t < sinceMs) continue;
    const title = tagText(block, 'title') || '(untitled)';
    const severity = classifyRssTitle(title);
    if (!severity) continue;
    const url = entryLink(block);
    findings.push({
      kind: 'rss',
      severity,
      source_id: source.id,
      name: source.name,
      slug: null,
      slugs: source.related ?? [],
      message: `${source.name}: ${title}`,
      observed: { title, published: new Date(t).toISOString() },
      url,
    });
  }
  return findings.sort((a, b) => String(b.observed.published).localeCompare(a.observed.published)).slice(0, FEED_CAP);
}

function litellmTokenPrices(entry) {
  if (entry?.input_cost_per_token != null && entry?.output_cost_per_token != null) {
    return {
      input: +(entry.input_cost_per_token * 1e6).toFixed(4),
      output: +(entry.output_cost_per_token * 1e6).toFixed(4),
    };
  }
  return null;
}

function pricesDiffer(a, b) {
  if (a == null || b == null) return false;
  const abs = Math.abs(Number(a) - Number(b));
  if (abs < 0.0005) return false;
  const rel = abs / Math.max(Math.abs(Number(a)), Math.abs(Number(b)), 1e-9);
  return rel > 0.02;
}

function priceSeverity(a, b) {
  const rel = Math.abs(Number(a) - Number(b)) / Math.max(Math.abs(Number(a)), Math.abs(Number(b)), 1e-9);
  return rel > 0.25 ? 'alert' : 'warn';
}

export function compareModelPrices(models, litellm, heliconeRaw, match) {
  const helicone = heliconeRaw?.data ?? [];
  const findings = [];
  const bySlug = new Map(models.map((m) => [m.slug, m]));
  for (const row of match) {
    const catalog = bySlug.get(row.slug);
    if (!catalog) continue;
    if (catalog.price_unit && catalog.price_unit !== 'mtok') continue;

    let observed = null;
    let source = null;
    let context = null;
    for (const key of row.litellm ?? []) {
      const entry = litellm?.[key];
      if (!entry) continue;
      const prices = litellmTokenPrices(entry);
      if (prices) {
        observed = prices;
        source = `litellm:${key}`;
        context = entry.max_input_tokens ?? entry.max_tokens ?? null;
        break;
      }
    }
    if (!observed && row.helicone) {
      const hit = helicone.find((e) => e.provider === row.helicone.provider && e.model === row.helicone.model);
      if (hit && hit.input_cost_per_1m > 0) {
        observed = { input: hit.input_cost_per_1m, output: hit.output_cost_per_1m };
        source = 'helicone';
      }
    }
    if (!observed) continue;

    if (pricesDiffer(catalog.price_input_per_mtok, observed.input) || pricesDiffer(catalog.price_output_per_mtok, observed.output)) {
      const a = catalog.price_input_per_mtok;
      const b = observed.input;
      findings.push({
        kind: 'price_drift',
        severity: priceSeverity(a ?? observed.input, b ?? a),
        slug: catalog.slug,
        name: catalog.name,
        message: `${catalog.name} price ${a}/${catalog.price_output_per_mtok} vs ${observed.input}/${observed.output} (${source})`,
        catalog: { in: catalog.price_input_per_mtok, out: catalog.price_output_per_mtok },
        observed: { in: observed.input, out: observed.output, source },
      });
    }
    if (
      row.context_override == null &&
      context != null &&
      catalog.context_window != null &&
      Number(context) !== Number(catalog.context_window)
    ) {
      findings.push({
        kind: 'context_drift',
        severity: 'warn',
        slug: catalog.slug,
        name: catalog.name,
        message: `${catalog.name} context ${catalog.context_window} vs ${context} (${source})`,
        catalog: { context_window: catalog.context_window },
        observed: { context_window: context, source },
      });
    }
  }
  return findings;
}

export function freshnessFindings(entries, { staleDays, now }) {
  const findings = [];
  for (const entry of entries) {
    if (!entry.last_verified) continue;
    const ageDays = (now.getTime() - new Date(`${entry.last_verified}T00:00:00Z`).getTime()) / 86_400_000;
    if (ageDays > staleDays) {
      findings.push({
        kind: 'stale',
        severity: 'warn',
        slug: entry.slug,
        name: entry.name ?? entry.slug,
        collection: entry.collection,
        message: `${entry.name ?? entry.slug} last verified ${entry.last_verified} (${Math.floor(ageDays)}d)`,
        catalog: { last_verified: entry.last_verified },
        observed: { age_days: Math.floor(ageDays), stale_days: staleDays },
      });
    }
  }
  return findings.sort((a, b) => b.observed.age_days - a.observed.age_days);
}

export function interpretGithubRepo(json, target, meta = {}) {
  if (meta.status === 404 || json == null) {
    return [
      {
        kind: 'github_missing',
        severity: 'alert',
        slug: target.slug,
        name: target.name,
        message: `${target.name} GitHub repo ${target.owner}/${target.repo} is gone`,
        url: `https://github.com/${target.owner}/${target.repo}`,
      },
    ];
  }
  if (json.archived) {
    return [
      {
        kind: 'github_archived',
        severity: 'alert',
        slug: target.slug,
        name: target.name,
        message: `${target.name} repo archived (${json.full_name ?? `${target.owner}/${target.repo}`})`,
        url: json.html_url ?? `https://github.com/${target.owner}/${target.repo}`,
        observed: { archived: true },
      },
    ];
  }
  return [];
}

export function interpretGithubRelease(json, target) {
  if (!json || json.prerelease) return [];
  if (!target.last_verified || !json.published_at) return [];
  const published = json.published_at.slice(0, 10);
  if (published <= target.last_verified) return [];
  const tag = json.tag_name ?? 'release';
  const severity = RELEASE_WARN.test(tag) || RELEASE_WARN.test(json.name ?? '') ? 'warn' : 'info';
  return [
    {
      kind: 'github_release',
      severity,
      slug: target.slug,
      name: target.name,
      message: `${target.name} released ${tag} on ${published} (card verified ${target.last_verified})`,
      url: json.html_url,
      observed: { tag, published },
      catalog: { last_verified: target.last_verified },
    },
  ];
}

export function summarize(findings) {
  const out = { alert: 0, warn: 0, info: 0 };
  for (const f of findings) {
    if (f.severity in out) out[f.severity] += 1;
  }
  return out;
}

function lineFor(f) {
  const who = f.slug ? `${f.name ?? f.slug} (\`${f.slug}\`)` : (f.name ?? f.source_id ?? f.kind);
  const url = f.url ? ` — ${f.url}` : '';
  return `- **${who}** — ${f.message}${url}`;
}

export function formatBrief(report) {
  const counts = summarize(report.findings);
  const by = { alert: [], warn: [], info: [] };
  for (const f of report.findings) {
    if (by[f.severity]) by[f.severity].push(f);
  }
  const day = String(report.generated_at).slice(0, 10);
  const lines = [
    `# Harvest ${day}`,
    '',
    `${counts.alert} alert · ${counts.warn} warn · ${counts.info} info`,
    `Kinds: ${(report.kinds_ran ?? []).join(', ') || '(none)'}`,
    `Since: ${report.since}`,
    '',
    'Observations only. Do not treat this as a catalog patch.',
    'Judgement is a content PR, not a reply here.',
    '',
  ];
  for (const sev of ['alert', 'warn', 'info']) {
    const list = by[sev];
    lines.push(`## ${sev[0].toUpperCase()}${sev.slice(1)}`);
    if (list.length === 0) {
      lines.push('_none_');
    } else {
      const shown = sev === 'info' ? list.slice(0, INFO_CAP) : list;
      for (const f of shown) lines.push(lineFor(f));
      if (list.length > shown.length) lines.push(`- _…and ${list.length - shown.length} more in the JSON artifact_`);
    }
    lines.push('');
  }
  lines.push('## Errors');
  if (!report.errors?.length) lines.push('_none_');
  else for (const e of report.errors) lines.push(`- **${e.kind}**${e.slug ? ` (\`${e.slug}\`)` : ''} — ${e.message}`);
  lines.push('');
  return lines.join('\n');
}

function isoDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function dayMinus(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - days);
  return isoDay(d);
}

async function fetchWithTimeout(fetchImpl, url, init = {}, ms = FETCH_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(fetchImpl, url, init = {}, ms = FETCH_MS) {
  try {
    return await fetchWithTimeout(fetchImpl, url, init, ms);
  } catch {
    return await fetchWithTimeout(fetchImpl, url, init, ms);
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 1 }, () => worker()));
  return out;
}

export async function runHarvest(opts) {
  const sources = opts.sources;
  const catalog = opts.catalog;
  const now = opts.now ?? new Date();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const githubToken = opts.githubToken ?? process.env.GITHUB_TOKEN;
  const since = opts.since ?? dayMinus(now, sources.rss_lookback_days);
  const requested = opts.kinds ?? KINDS;
  const kindsRan = requested.filter((k) => KINDS.includes(k) && sources.kinds[k] !== false);

  const findings = [];
  const errors = [];
  const stats = {};
  const entries = [...catalog.tools, ...catalog.agents, ...catalog.graveyard];
  const allEntries = [...entries, ...catalog.models];

  const headers = { 'User-Agent': UA, Accept: 'application/json, text/xml, */*' };

  if (kindsRan.includes('status')) {
    stats.status_pages = sources.status_pages.length;
    let incidents = 0;
    await mapPool(sources.status_pages, POOL, async (page) => {
      try {
        const res = await fetchWithRetry(fetchImpl, page.url, { headers });
        if (!res.ok) {
          errors.push({ kind: 'status', message: `${page.id} HTTP ${res.status}` });
          return;
        }
        const json = await res.json();
        if (json?.status?.indicator && json.status.indicator !== 'none' && !Array.isArray(json.incidents)) {
          const incUrl = String(page.url).replace(/\/api\/v2\/status\.json$/, '/api/v2/incidents/unresolved.json');
          if (incUrl !== page.url) {
            try {
              const incRes = await fetchWithTimeout(fetchImpl, incUrl, { headers });
              if (incRes.ok) {
                const incJson = await incRes.json();
                json.incidents = incJson.incidents ?? [];
              }
            } catch {
              // status-only is still a finding
            }
          }
        }
        const finding = interpretStatus(json, page);
        if (finding) {
          incidents += 1;
          findings.push(finding);
        }
      } catch (err) {
        errors.push({ kind: 'status', message: `${page.id}: ${err.message}` });
      }
    });
    stats.status_incidents = incidents;
  }

  if (kindsRan.includes('rss')) {
    stats.rss_feeds = sources.rss.length;
    await mapPool(sources.rss, POOL, async (feed) => {
      try {
        const res = await fetchWithRetry(fetchImpl, feed.url, { headers: { ...headers, Accept: 'application/rss+xml, application/atom+xml, text/xml, */*' } });
        if (!res.ok) {
          errors.push({ kind: 'rss', message: `${feed.id} HTTP ${res.status}` });
          return;
        }
        findings.push(...parseFeed(await res.text(), { source: feed, since }));
      } catch (err) {
        errors.push({ kind: 'rss', message: `${feed.id}: ${err.message}` });
      }
    });
    stats.rss_items = findings.filter((f) => f.kind === 'rss').length;
  }

  if (kindsRan.includes('models')) {
    try {
      const [hRes, lRes] = await Promise.all([
        fetchWithTimeout(fetchImpl, sources.models.sources.helicone, { headers }),
        fetchWithTimeout(fetchImpl, sources.models.sources.litellm, { headers }),
      ]);
      if (!hRes.ok || !lRes.ok) {
        errors.push({ kind: 'models', message: `HTTP helicone ${hRes.status} litellm ${lRes.status}` });
      } else {
        const helicone = await hRes.json();
        const litellm = await lRes.json();
        const drift = compareModelPrices(catalog.models, litellm, helicone, sources.models.match);
        findings.push(...drift);
        stats.models_matched = sources.models.match.length;
        stats.model_drift = drift.length;
      }
    } catch (err) {
      errors.push({ kind: 'models', message: err.message });
    }
  }

  if (kindsRan.includes('freshness')) {
    const stale = freshnessFindings(allEntries, { staleDays: sources.stale_days, now });
    findings.push(...stale);
    stats.stale = stale.length;
  }

  if (kindsRan.includes('github')) {
    if (!githubToken) {
      errors.push({ kind: 'github', message: 'skipped: no GITHUB_TOKEN' });
    } else {
      const targets = deriveGithubTargets(entries, sources);
      stats.github_targets = targets.length;
      const ghHeaders = {
        'User-Agent': UA,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${githubToken}`,
      };
      await mapPool(targets, POOL, async (target) => {
        const repoUrl = `https://api.github.com/repos/${target.owner}/${target.repo}`;
        try {
          const res = await fetchWithTimeout(fetchImpl, repoUrl, { headers: ghHeaders });
          if (res.status === 404) {
            findings.push(...interpretGithubRepo(null, target, { status: 404 }));
            return;
          }
          if (!res.ok) {
            errors.push({ kind: 'github', slug: target.slug, message: `repo HTTP ${res.status}` });
            return;
          }
          const repo = await res.json();
          findings.push(...interpretGithubRepo(repo, target));
          const rel = await fetchWithTimeout(fetchImpl, `${repoUrl}/releases?per_page=20`, { headers: ghHeaders });
          if (rel.status === 404) return;
          if (!rel.ok) {
            errors.push({ kind: 'github', slug: target.slug, message: `release HTTP ${rel.status}` });
            return;
          }
          const picked = pickProductRelease(await rel.json(), target);
          if (picked) findings.push(...interpretGithubRelease(picked, target));
        } catch (err) {
          errors.push({ kind: 'github', slug: target.slug, message: err.message });
        }
      });
      stats.github_archived = findings.filter((f) => f.kind === 'github_archived').length;
      stats.github_missing = findings.filter((f) => f.kind === 'github_missing').length;
    }
  }

  const order = { alert: 0, warn: 1, info: 2 };
  findings.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || String(a.slug ?? a.name).localeCompare(String(b.slug ?? b.name)));

  return {
    generated_at: now.toISOString(),
    since,
    kinds_ran: kindsRan,
    stats,
    findings,
    errors,
  };
}
