/**
 * Navy + cream N mark. Faces do not survive 16px — they read as a triangle.
 * Regenerates public/favicon.svg + png + ico + apple-touch-icon.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');

export const FAVICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Noemium">
  <rect width="32" height="32" fill="#0D1F4B"/>
  <path fill="#F3EFE4" d="M8 26V6h3.6l8.8 13.2V6H24v20h-3.6L11.6 12.8V26H8z"/>
</svg>
`;

function pngAt(width) {
  const resvg = new Resvg(FAVICON_SVG, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(0,0,0,0)',
  });
  return Buffer.from(resvg.render().asPng());
}

function writeIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const png of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(png.w >= 256 ? 0 : png.w, 0);
    entry.writeUInt8(png.h >= 256 ? 0 : png.h, 1);
    entry.writeUInt32LE(png.buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.buf.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
}

const png16 = pngAt(16);
const png32 = pngAt(32);
const png180 = pngAt(180);

writeFileSync(join(out, 'favicon.svg'), FAVICON_SVG);
writeFileSync(join(out, 'favicon-16.png'), png16);
writeFileSync(join(out, 'favicon-32.png'), png32);
writeFileSync(join(out, 'apple-touch-icon.png'), png180);
writeFileSync(
  join(out, 'favicon.ico'),
  writeIco([
    { w: 16, h: 16, buf: png16 },
    { w: 32, h: 32, buf: png32 },
  ]),
);

console.log('wrote favicon.svg / .ico / -16 / -32 / apple-touch-icon');
