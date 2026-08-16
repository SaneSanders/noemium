// Logo availability for catalog entries. Logos are committed PNGs in
// public/logos/<slug>.png (see scripts/fetch-logos.mjs). Read once at build
// time; components fall back to a letter tile when a logo is missing.
// Resolve from the project root (cwd) — at build time this module is bundled
// into dist/, so import.meta.url would point at the wrong place.
import { readdirSync } from 'node:fs';
import path from 'node:path';

const logosDir = path.resolve(process.cwd(), 'public', 'logos');
const available = new Set(
  readdirSync(logosDir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.replace(/\.png$/, '')),
);

export const hasLogo = (slug: string): boolean => available.has(slug);
export const logoSrc = (slug: string): string | null =>
  available.has(slug) ? `/logos/${slug}.png` : null;
