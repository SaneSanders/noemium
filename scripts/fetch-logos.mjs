// Fetch logos into public/logos/<slug>.png for tools, agents, and a few
// provider-only marks used by the models table. Sources (fallback chain):
// GitHub avatar → Google favicon 256 → Clearbit → DuckDuckGo → site icons.
// Committed so the site stays self-hosted — no runtime third-party requests.
// Usage: node scripts/fetch-logos.mjs
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'logos');
mkdirSync(OUT_DIR, { recursive: true });

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_LOGO_BYTES = 512 * 1024;

const domainOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const GITHUB_SKIP_OWNERS = new Set([
  'features',
  'topics',
  'orgs',
  'settings',
  'marketplace',
  'sponsors',
  'about',
  'pricing',
  'enterprise',
  'security',
  'login',
  'join',
  'apps',
  'codespaces',
  'copilot',
  'collections',
  'explore',
  'issues',
  'pulls',
]);

const githubOwner = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname === 'github.com') {
      const owner = u.pathname.split('/').filter(Boolean)[0];
      if (!owner || GITHUB_SKIP_OWNERS.has(owner.toLowerCase())) return null;
      return owner;
    }
    if (u.hostname.endsWith('.github.io')) {
      return u.hostname.replace(/\.github\.io$/, '');
    }
  } catch {
    return null;
  }
  return null;
};

const isGithubCom = (domain) => domain === 'github.com' || domain === 'www.github.com';

const yamlUrl = (file) => {
  const src = readFileSync(file, 'utf8');
  const m = src.match(/^url:\s*"?([^"\s]+)"?\s*$/m);
  return m ? m[1] : null;
};

const entriesFrom = (dir, ext) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => {
      const slug = f.replace(new RegExp(`\\${ext}$`), '');
      const url = yamlUrl(path.join(dir, f));
      return { slug, url, domain: url ? domainOf(url) : null, github: url ? githubOwner(url) : null };
    });
};

const tools = entriesFrom(path.join(ROOT, 'src', 'content', 'tools'), '.yaml');
const agents = entriesFrom(path.join(ROOT, 'src', 'content', 'agents'), '.yaml');
const graveyard = entriesFrom(path.join(ROOT, 'src', 'content', 'graveyard'), '.yaml');
const extras = [
  { slug: 'meta', url: 'https://www.meta.com', domain: 'www.meta.com', github: null },
];

const all = [...tools, ...agents, ...graveyard, ...extras];

const pngFromIco = (buf) => {
  const idx = buf.indexOf(PNG_SIG);
  return idx >= 0 ? buf.subarray(idx) : null;
};

const isPng = (buf) => buf.length >= 24 && buf.subarray(0, 8).equals(PNG_SIG);
const isSvg = (buf) => {
  const head = buf.subarray(0, 200).toString('utf8').trim().toLowerCase();
  return head.startsWith('<svg') || head.startsWith('<?xml') || head.includes('<svg');
};

const rasterizeSvg = (buf) => {
  try {
    const png = Buffer.from(
      new Resvg(buf.toString('utf8'), { fitTo: { mode: 'width', value: 128 } }).render().asPng(),
    );
    return isPng(png) ? png : null;
  } catch {
    return null;
  }
};

const usablePng = (buf) => {
  if (!buf || buf.length < 80 || buf.length > MAX_LOGO_BYTES) return null;
  if (isPng(buf)) return buf;
  if (isSvg(buf)) return rasterizeSvg(buf);
  const fromIco = pngFromIco(buf);
  if (fromIco && fromIco.length >= 80 && fromIco.length <= MAX_LOGO_BYTES) return fromIco;
  return null;
};

const existingOk = (slug) => {
  const png = path.join(OUT_DIR, `${slug}.png`);
  const svg = path.join(OUT_DIR, `${slug}.svg`);
  if (existsSync(svg)) return true;
  if (!existsSync(png)) return false;
  const buf = readFileSync(png);
  if (isPng(buf) || isSvg(buf)) return true;
  const extracted = pngFromIco(buf);
  if (extracted) {
    writeFileSync(png, extracted);
    return true;
  }
  return false;
};

const sourcesFor = (t) => {
  const list = [];
  if (t.github) {
    list.push(`https://github.com/${t.github}.png?size=128`);
    list.push(`https://avatars.githubusercontent.com/${t.github}?s=128`);
  }
  if (t.domain && !isGithubCom(t.domain)) {
    const d = t.domain;
    list.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=256`);
    list.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`);
    list.push(`https://logo.clearbit.com/${d}`);
    list.push(`https://icons.duckduckgo.com/ip3/${d}.ico`);
    list.push(`https://${d}/apple-touch-icon.png`);
    list.push(`https://${d}/apple-touch-icon-precomposed.png`);
    list.push(`https://${d}/favicon.png`);
    list.push(`https://${d}/favicon.ico`);
    list.push(`https://icon.horse/icon/${d}`);
  }
  return list;
};

const fetchBuf = async (url) => {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'user-agent': 'noemium-logo-fetch/1.0' },
    redirect: 'follow',
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
};

const queue = all.filter((t) => !existingOk(t.slug));
let ok = all.length - queue.length;
const failed = [];

const workers = Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const t = queue.shift();
    const out = path.join(OUT_DIR, `${t.slug}.png`);
    let saved = false;
    for (const src of sourcesFor(t)) {
      try {
        const buf = await fetchBuf(src);
        const png = usablePng(buf);
        if (!png) continue;
        writeFileSync(out, png);
        saved = true;
        break;
      } catch {
        // next source
      }
    }
    if (saved) ok++;
    else failed.push(`${t.slug} (${t.domain ?? t.url ?? 'no-url'})`);
  }
});
await Promise.all(workers);

// Same-brand copies for entries that still have no file of their own.
const ALIASES = {
  gemini: 'google-ai-studio',
  'gemini-nano-banana': 'google-ai-studio',
  'google-antigravity': 'google-ai-studio',
  'google-vertex-ai': 'google-ai-studio',
  'openai-codex': 'openai-api',
  'openai-agents-sdk': 'openai-api',
  'gpt-image': 'openai-api',
  'deepseek-chat': 'deepseek-api',
  'kimi-api': 'kimi-code',
  grok: 'xai-api',
  'grok-imagine': 'xai-api',
  'grok-bot': 'xai-api',
  'grok-build': 'xai-api',
  comet: 'perplexity',
  seedream: 'bytedance-seed',
  wan: 'qwen-image',
};

let aliased = 0;
for (const [slug, from] of Object.entries(ALIASES)) {
  if (existingOk(slug)) continue;
  const src = path.join(OUT_DIR, `${from}.png`);
  const svg = path.join(OUT_DIR, `${from}.svg`);
  const dest = path.join(OUT_DIR, `${slug}.png`);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    aliased++;
    ok++;
  } else if (existsSync(svg)) {
    copyFileSync(svg, path.join(OUT_DIR, `${slug}.svg`));
    aliased++;
    ok++;
  }
}

const stillMissing = failed.filter((line) => {
  const slug = line.split(' ')[0];
  return !existingOk(slug);
});

console.log(`logos: ${ok}/${all.length} on disk (${aliased} aliased)`);
if (stillMissing.length) console.log(`missing:\n  ${stillMissing.join('\n  ')}`);
