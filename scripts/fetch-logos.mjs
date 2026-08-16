// Fetch tool logos into public/logos/<slug>.png.
// Sources (fallback chain): Google favicon service (128px) → DuckDuckGo
// icons → the site's own /favicon.ico. Committed to the repo so the site
// stays fully self-hosted — no runtime third-party requests.
// Usage: node scripts/fetch-logos.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS_DIR = path.join(ROOT, 'src', 'content', 'tools');
const OUT_DIR = path.join(ROOT, 'public', 'logos');
mkdirSync(OUT_DIR, { recursive: true });

const domainOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const SOURCES = [
  (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`,
  (d) => `https://icons.duckduckgo.com/ip3/${d}.ico`,
  (d) => `https://${d}/favicon.ico`,
  (d) => `https://${d}/apple-touch-icon.png`,
];

const looksLikeImage = (buf) =>
  buf.length >= 500 &&
  (buf.subarray(1, 4).toString() === 'PNG' || buf.subarray(0, 4).toString('hex') === '00000100');

const tools = readdirSync(TOOLS_DIR)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => {
    const src = readFileSync(path.join(TOOLS_DIR, f), 'utf8');
    const m = src.match(/^url:\s*"?([^"\s]+)"?\s*$/m);
    return { slug: f.replace(/\.yaml$/, ''), domain: m ? domainOf(m[1]) : null };
  })
  .filter((t) => t.domain);

let ok = 0;
const failed = [];
const queue = [...tools];
const workers = Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const t = queue.shift();
    const out = path.join(OUT_DIR, `${t.slug}.png`);
    if (existsSync(out)) {
      ok++;
      continue;
    }
    let saved = false;
    for (const src of SOURCES) {
      try {
        const res = await fetch(src(t.domain), { signal: AbortSignal.timeout(15000) });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (!looksLikeImage(buf)) continue;
        writeFileSync(out, buf);
        saved = true;
        break;
      } catch {
        // try the next source
      }
    }
    if (saved) ok++;
    else failed.push(`${t.slug} (${t.domain})`);
  }
});
await Promise.all(workers);
console.log(`logos: ${ok}/${tools.length} saved`);
if (failed.length) console.log(`missing:\n  ${failed.join('\n  ')}`);
