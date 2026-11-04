/**
 * npm run icons — app icons from one SVG (temporary monogram: replace public/favicon.svg with the
 * official mark and run again).
 */
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public/icons');

async function main() {
  await mkdir(OUT, { recursive: true });
  const svg = await readFile(join(ROOT, 'public/favicon.svg'));
  const icon = (size: number) => sharp(svg, { density: 72 * (size / 64) }).resize(size, size);
  await icon(192).png().toFile(join(OUT, 'icon-192.png'));
  await icon(512).png().toFile(join(OUT, 'icon-512.png'));
  await icon(180).png().toFile(join(OUT, 'apple-touch-icon.png'));
  // Maskable: the mark inside the 80% safe zone, on the full green background.
  const inner = await icon(400).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0c2b22' } })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(join(OUT, 'icon-maskable-512.png'));
  console.log('✔ Icons in public/icons');
}
main();
