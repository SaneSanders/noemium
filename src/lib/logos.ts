// Logo availability for catalog entries. Logos are committed PNGs in
// public/logos/<slug>.png (see scripts/fetch-logos.mjs). Read once at build
// time; components fall back to a letter tile when a logo is missing.
// Resolve from the project root (cwd) — at build time this module is bundled
// into dist/, so import.meta.url would point at the wrong place.
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const logosDir = path.resolve(process.cwd(), 'public', 'logos');
const available = new Set(
  readdirSync(logosDir)
    .filter((f) => f.endsWith('.png') || f.endsWith('.svg'))
    .map((f) => f.replace(/\.(png|svg)$/, '')),
);

export const hasLogo = (slug: string): boolean => available.has(slug);
export const logoSrc = (slug: string): string | null => {
  if (!available.has(slug)) return null;
  // PNG is the canonical format; a hand-placed SVG wins when it exists.
  return existsSync(path.join(logosDir, `${slug}.svg`))
    ? `/logos/${slug}.svg`
    : `/logos/${slug}.png`;
};
