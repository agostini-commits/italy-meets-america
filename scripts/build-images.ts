/**
 * npm run images [-- --force]
 *
 * From the originals in media/originals (downloaded from the Drive folder) generates, for every
 * card in data/companies.json and for the edition covers:
 *   public/img/<edition>/<id>/<name>-600|1000|1600.webp   web (srcset)
 *   public/img/<edition>/<id>/<name>-print.jpg            300 dpi, sRGB, long side 3600 px (print only)
 *   public/img/<edition>/<id>/<name>-og.jpg               1200×630 for LinkedIn / WhatsApp previews (main photo)
 *   public/img/<edition>/manifest.json                    sizes, dominant colour and URLs, read by the app
 * SVG logos are copied as they are. A file already processed (same size and date) is skipped:
 * --force redoes everything.
 */
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';
import { PRINT_LONG_SIDE, WEB_WIDTHS } from '../src/schema';
import type { Company, Edition, ImageInfo } from '../src/types';

const ROOT = new URL('..', import.meta.url).pathname;
const MEDIA = join(ROOT, 'media/originals');
const OUT = join(ROOT, 'public/img');
const force = process.argv.includes('--force');

type Manifest = Record<string, ImageInfo & { src: string }>;

interface Job {
  edition: number;
  folder: string; // "<id>" or "_cover"
  file: string;
  kind: 'photo' | 'gallery' | 'logo' | 'cover';
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

async function processJob(job: Job, previous: Manifest): Promise<(ImageInfo & { src: string }) | null> {
  const input = join(MEDIA, job.file);
  if (!existsSync(input)) return null;
  const s = await stat(input);
  const src = `${s.size}-${Math.round(s.mtimeMs)}`;
  const old = previous[job.file];
  if (!force && old?.src === src) return old;

  const dir = join(OUT, String(job.edition), job.folder);
  await mkdir(dir, { recursive: true });
  const url = (f: string) => `/img/${job.edition}/${job.folder}/${f}`;
  const base = parse(job.file).name;

  if (job.file.toLowerCase().endsWith('.svg')) {
    await copyFile(input, join(dir, job.file));
    return { src, width: 0, height: 0, color: 'transparent', web: {}, print: null, og: null, svg: url(job.file) };
  }

  const img = sharp(input, { failOn: 'none' }).rotate(); // apply EXIF orientation
  const meta = await img.metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = (rotated ? meta.height : meta.width) ?? 0;
  const height = (rotated ? meta.width : meta.height) ?? 0;
  const { dominant } = await img.clone().stats();
  const color = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;

  const web: Record<string, string> = {};
  // Only real widths: a 907 px photo gets 600 and 907, never a fake "1600" (the srcset would lie).
  const wanted = job.kind === 'logo' ? [400, 800] : [...WEB_WIDTHS];
  const widths = wanted.filter((w) => w <= width);
  if (widths.length < wanted.length) widths.push(width);
  for (const w of widths) {
    const name = `${base}-${w}.webp`;
    await img
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      // cover: busy landscape, first image of the site: a little more compression (−25% weight, no visible loss)
      .webp({ quality: job.kind === 'logo' ? 90 : job.kind === 'cover' ? 70 : 78, alphaQuality: 90, effort: 6 })
      .toFile(join(dir, name));
    web[w] = url(name);
  }

  let print: string | null = null;
  if (job.kind !== 'logo') {
    const name = `${base}-print.jpg`;
    await img
      .clone()
      .resize({ width: PRINT_LONG_SIDE, height: PRINT_LONG_SIDE, fit: 'inside', withoutEnlargement: true })
      .toColorspace('srgb')
      .jpeg({ quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true })
      .withMetadata({ density: 300 })
      .toFile(join(dir, name));
    print = url(name);
  } else {
    const name = `${base}-print.png`;
    await img.clone().resize({ width: 1600, withoutEnlargement: true }).png().withMetadata({ density: 300 }).toFile(join(dir, name));
    print = url(name);
  }

  let og: string | null = null;
  if (job.kind === 'photo' || job.kind === 'cover') {
    const name = `${base}-og.jpg`;
    await img.clone().resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(dir, name));
    og = url(name);
  }

  return { src, width, height, color, web, print, og };
}

async function main() {
  if (!existsSync(MEDIA)) {
    console.error('⛔ Missing media/originals: download the originals from the Drive folder first.');
    process.exit(1);
  }
  const companies: Company[] = JSON.parse(await readFile(join(ROOT, 'data/companies.json'), 'utf8'));
  const editions: Edition[] = JSON.parse(await readFile(join(ROOT, 'config/editions.json'), 'utf8'));

  const jobs: Job[] = [];
  for (const e of editions) jobs.push({ edition: e.edition, folder: '_cover', file: e.cover_photo, kind: 'cover' });
  for (const c of companies) {
    jobs.push({ edition: c.edition, folder: c.id, file: c.photo.file, kind: 'photo' });
    jobs.push({ edition: c.edition, folder: c.id, file: c.logo, kind: 'logo' });
    for (const g of c.gallery) jobs.push({ edition: c.edition, folder: c.id, file: g.file, kind: 'gallery' });
  }

  const byEdition = new Map<number, Job[]>();
  for (const j of jobs) byEdition.set(j.edition, [...(byEdition.get(j.edition) ?? []), j]);

  let made = 0;
  let missing = 0;
  for (const [edition, list] of byEdition) {
    const manifestPath = join(OUT, String(edition), 'manifest.json');
    const previous: Manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : {};
    const manifest: Manifest = {};
    for (const job of list) {
      const info = await processJob(job, previous);
      if (!info) {
        missing++;
        console.warn(`  ⚠ ${job.folder}: "${job.file}" not found`);
        continue;
      }
      if (info !== previous[job.file]) made++;
      manifest[job.file] = info;
    }
    await mkdir(join(OUT, String(edition)), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  }
  console.log(`✔ Images: ${made} processed, ${jobs.length - made - missing} unchanged, ${missing} missing`);
}

main().catch((e) => {
  console.error('⛔', e instanceof Error ? e.message : e);
  process.exit(1);
});
