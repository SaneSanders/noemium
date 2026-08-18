// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** last_verified from content files → sitemap lastmod. */
function catalogLastmods() {
  /** @type {Record<string, string>} */
  const map = {};
  const root = join(import.meta.dirname, 'src/content');
  /** @type {Record<string, string>} */
  const prefix = {
    tools: '/tools/',
    stacks: '/stacks/',
    agents: '/agents/',
  };
  for (const [col, href] of Object.entries(prefix)) {
    const dir = join(root, col);
    let files = [];
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.(yaml|md)$/.test(file)) continue;
      const text = readFileSync(join(dir, file), 'utf8');
      const date = text.match(/last_verified:\s*"?(\d{4}-\d{2}-\d{2})"?/)?.[1];
      if (!date) continue;
      const slug = file.replace(/\.(yaml|md)$/, '');
      map[`${href}${slug}/`] = date;
    }
  }
  return map;
}

const lastmods = catalogLastmods();

// https://astro.build/config
export default defineConfig({
  site: 'https://noemium.com',
  trailingSlash: 'always',
  integrations: [
    preact(),
    sitemap({
      filter(page) {
        return !page.includes('/decide');
      },
      serialize(item) {
        const path = new URL(item.url).pathname;
        const lastmod = lastmods[path];
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  markdown: {
    processor: unified({ remarkRehype: { allowDangerousHtml: false } }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
