/**
 * Pack the committed Nema-face PNGs into favicon.ico.
 * Do not replace the face with a letter mark.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

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

const png16 = readFileSync(join(out, 'favicon-16.png'));
const png32 = readFileSync(join(out, 'favicon-32.png'));
const png48 = readFileSync(join(out, 'favicon-48.png'));

writeFileSync(
  join(out, 'favicon.ico'),
  writeIco([
    { w: 16, h: 16, buf: png16 },
    { w: 32, h: 32, buf: png32 },
    { w: 48, h: 48, buf: png48 },
  ]),
);

console.log('packed favicon.ico from Nema face pngs');
