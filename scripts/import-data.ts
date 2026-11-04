/**
 * npm run import-data [-- --csv path | --url https://… ] [--strict]
 *
 * Reads the "Companies" tab of the Google Sheet (CSV), validates every row and writes:
 *   data/companies.json                       all published cards (all editions)
 *   public/data/<edition>/companies.json      what the app loads
 *   public/data/editions.json                 editions with at least one card
 *   data/import-report.md / .json             the report for the editorial team
 *
 * Source, in this order: --csv, --url, env SHEET_CSV_URL, data/source/companies.csv.
 * Only "approved" and "published" rows are written; the others are validated and counted.
 * --strict (automatic when CI=true): exits with 1 if an approved/published row has errors,
 * so a deploy never drops a company silently.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { PHOTO_MIN } from '../src/schema';
import type { Company, Edition } from '../src/types';
import { parseCompaniesCsv } from './lib/csv';
import { crossCheck, isPublic, validateRow, type Lists, type RowResult } from './lib/validate';

const ROOT = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const strict = args.includes('--strict') || process.env.CI === 'true';
const mediaDir = arg('media') ?? join(ROOT, 'media/originals');

async function readSource(): Promise<{ text: string; source: string }> {
  const csv = arg('csv');
  if (csv) return { text: await readFile(csv, 'utf8'), source: csv };
  const url = arg('url') ?? process.env.SHEET_CSV_URL;
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Cannot download the sheet (${res.status} ${res.statusText}): ${url}`);
    const text = await res.text();
    if (text.trimStart().startsWith('<')) throw new Error('The URL returned a web page, not a CSV: publish the "Companies" tab as CSV.');
    return { text, source: 'Google Sheet (published CSV)' };
  }
  const local = join(ROOT, 'data/source/companies.csv');
  return { text: await readFile(local, 'utf8'), source: 'data/source/companies.csv' };
}

interface PhotoCheck {
  id: string;
  file: string;
  kind: 'photo' | 'logo' | 'gallery';
  found: boolean;
  width?: number;
  height?: number;
  ok: boolean;
}

/** Photo size checks: only if the originals folder is there (in CI it is downloaded from Drive). */
async function checkImages(results: RowResult[]): Promise<{ checked: boolean; list: PhotoCheck[] }> {
  if (!existsSync(mediaDir)) return { checked: false, list: [] };
  const list: PhotoCheck[] = [];
  for (const r of results) {
    const c = r.company;
    if (!c) continue;
    const files: [string, PhotoCheck['kind']][] = [
      [c.photo.file, 'photo'],
      [c.logo, 'logo'],
      ...c.gallery.map((g) => [g.file, 'gallery'] as [string, PhotoCheck['kind']]),
    ];
    for (const [file, kind] of files) {
      const path = join(mediaDir, file);
      if (!existsSync(path)) {
        list.push({ id: c.id, file, kind, found: false, ok: false });
        r.warnings.push({ field: kind, message: `file "${file}" not found in the originals folder` });
        continue;
      }
      if (kind === 'logo' && file.toLowerCase().endsWith('.svg')) {
        list.push({ id: c.id, file, kind, found: true, ok: true });
        continue;
      }
      const meta = await sharp(path).metadata();
      // EXIF orientation 5-8 = rotated 90°: swap width and height.
      const rotated = (meta.orientation ?? 1) >= 5;
      const width = (rotated ? meta.height : meta.width) ?? 0;
      const height = (rotated ? meta.width : meta.height) ?? 0;
      let ok = true;
      if (kind === 'photo') {
        ok = width >= PHOTO_MIN.width && height >= PHOTO_MIN.height;
        if (!ok) r.warnings.push({ field: 'photo', message: `${width}×${height} px, below ${PHOTO_MIN.width}×${PHOTO_MIN.height}: fine on the web, NOT good enough for print` });
        if (width > height) r.warnings.push({ field: 'photo', message: 'landscape photo: the card uses a vertical crop, check the framing' });
      } else if (kind === 'gallery') {
        ok = Math.min(width, height) >= PHOTO_MIN.width && Math.max(width, height) >= PHOTO_MIN.height;
        if (!ok) r.warnings.push({ field: 'gallery', message: `"${file}" ${width}×${height} px, below ${PHOTO_MIN.width}×${PHOTO_MIN.height}` });
      } else {
        ok = width >= 800;
        if (!ok) r.warnings.push({ field: 'logo', message: `"${file}" is ${width} px wide: send an SVG or a PNG at least 800 px wide` });
      }
      list.push({ id: c.id, file, kind, found: true, width, height, ok });
    }
  }
  return { checked: true, list };
}

function sortCompanies(list: Company[], sectors: string[]): Company[] {
  const pos = (s: string) => {
    const i = sectors.indexOf(s);
    return i < 0 ? 999 : i;
  };
  return [...list].sort(
    (a, b) =>
      a.edition - b.edition ||
      pos(a.sector) - pos(b.sector) ||
      (a.sort_order ?? 9999) - (b.sort_order ?? 9999) ||
      a.name.localeCompare(b.name, 'en'),
  );
}

function reportMarkdown(p: {
  source: string;
  results: RowResult[];
  published: Company[];
  missingColumns: string[];
  unknownColumns: string[];
  images: { checked: boolean; list: PhotoCheck[] };
  sectorVariants: Map<string, Set<string>>;
}): string {
  const { results, published } = p;
  const now = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Rome' });
  const withErrors = results.filter((r) => r.errors.length);
  const publicWithErrors = withErrors.filter((r) => isPublic(r.status));
  const withWarnings = results.filter((r) => r.warnings.length);
  const byStatus = new Map<string, number>();
  for (const r of results) byStatus.set(r.status || '(empty)', (byStatus.get(r.status || '(empty)') ?? 0) + 1);
  const pages = published.reduce((s, c) => s + c.pages, 0);

  const L: string[] = [];
  L.push(`# Import report – Italy meets America`, '', `Source: ${p.source} · ${now}`, '');
  L.push('## Summary', '');
  L.push(`| | |`, `|---|---:|`);
  L.push(`| Rows in the sheet | ${results.length} |`);
  for (const [s, n] of byStatus) L.push(`| status ${s} | ${n} |`);
  L.push(`| **Published in the app** | **${published.length}** |`);
  L.push(`| Print pages (base 2, premium 4) | ${pages} |`);
  L.push(`| Approved/published rows NOT published because of errors | ${publicWithErrors.length} |`);
  L.push(`| Rows with warnings | ${withWarnings.length} |`, '');

  if (p.missingColumns.length) L.push(`> ⛔ Missing columns in the sheet: ${p.missingColumns.join(', ')}`, '');
  if (p.unknownColumns.length) L.push(`> ⚠️ Columns not used by the app (ignored): ${p.unknownColumns.join(', ')}`, '');

  L.push('## Errors (the card is not published)', '');
  if (!withErrors.length) L.push('None.', '');
  for (const r of withErrors) {
    L.push(`### Row ${r.line} · ${r.name || '(no name)'} · \`${r.id || '—'}\` · ${r.status || 'no status'}`);
    for (const e of r.errors) L.push(`- **${e.field}**: ${e.message}`);
    L.push('');
  }

  L.push('## Warnings (published, to check)', '');
  if (!withWarnings.length) L.push('None.', '');
  for (const r of withWarnings) {
    L.push(`### Row ${r.line} · ${r.name || '(no name)'} · \`${r.id || '—'}\``);
    for (const w of r.warnings) L.push(`- **${w.field}**: ${w.message}`);
    L.push('');
  }

  L.push('## Sectors written in different ways', '');
  const variants = [...p.sectorVariants].filter(([, s]) => s.size > 1);
  if (!variants.length) L.push('None.', '');
  for (const [canonical, set] of variants) L.push(`- **${canonical}**: ${[...set].map((v) => `"${v}"`).join(', ')}`);
  if (variants.length) L.push('');

  L.push('## Photos', '');
  if (!p.images.checked) L.push('Not checked: the folder `media/originals` is missing (download the originals from Drive).', '');
  else {
    const bad = p.images.list.filter((i) => !i.ok);
    L.push(`${p.images.list.length} files checked, ${bad.length} to fix (minimum ${PHOTO_MIN.width}×${PHOTO_MIN.height} px for photos).`, '');
    if (bad.length) {
      L.push('| Company | File | Type | Size |', '|---|---|---|---|');
      for (const i of bad) L.push(`| ${i.id} | ${i.file} | ${i.kind} | ${i.found ? `${i.width}×${i.height}` : 'not found'} |`);
      L.push('');
    }
  }
  return L.join('\n');
}

async function main() {
  const lists: Lists = JSON.parse(await readFile(join(ROOT, 'config/lists.json'), 'utf8'));
  const editions: Edition[] = JSON.parse(await readFile(join(ROOT, 'config/editions.json'), 'utf8'));
  const { text, source } = await readSource();
  const parsed = parseCompaniesCsv(text);

  if (parsed.missingColumns.length) {
    console.error(`⛔ The sheet is missing these columns: ${parsed.missingColumns.join(', ')}`);
    process.exit(1);
  }

  const results = parsed.rows.map(({ row, line }) => validateRow(row, line, lists));
  crossCheck(results);
  const images = await checkImages(results);

  const sectorVariants = new Map<string, Set<string>>();
  for (const [i, { row }] of parsed.rows.entries()) {
    const raw = (row.sector ?? '').trim();
    const canonical = results[i].company?.sector;
    if (!raw || !canonical) continue;
    if (!sectorVariants.has(canonical)) sectorVariants.set(canonical, new Set());
    sectorVariants.get(canonical)!.add(raw);
  }

  const published = sortCompanies(
    results.filter((r) => r.company && isPublic(r.status)).map((r) => r.company!),
    lists.sectors,
  );

  await mkdir(join(ROOT, 'data'), { recursive: true });
  await writeFile(join(ROOT, 'data/companies.json'), JSON.stringify(published, null, 2) + '\n');

  const editionNumbers = [...new Set(published.map((c) => c.edition))].sort();
  for (const ed of editionNumbers) {
    const dir = join(ROOT, 'public/data', String(ed));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'companies.json'), JSON.stringify(published.filter((c) => c.edition === ed)));
  }
  const live = editions.filter((e) => editionNumbers.includes(e.edition));
  await writeFile(join(ROOT, 'public/data/editions.json'), JSON.stringify(live, null, 2) + '\n');

  const md = reportMarkdown({ source, results, published, ...parsed, images, sectorVariants });
  await writeFile(join(ROOT, 'data/import-report.md'), md + '\n');
  await writeFile(
    join(ROOT, 'data/import-report.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source,
        published: published.length,
        rows: results.map(({ company, ...r }) => ({ ...r, published: !!company && isPublic(r.status) })),
        images,
      },
      null,
      2,
    ) + '\n',
  );

  const blocking = results.filter((r) => r.errors.length && isPublic(r.status));
  const warnings = results.reduce((n, r) => n + r.warnings.length, 0);
  console.log(`✔ ${published.length} cards published (${editionNumbers.join(', ') || 'no edition'}) from ${results.length} rows`);
  console.log(`  ${results.filter((r) => r.errors.length).length} rows with errors (${blocking.length} approved/published), ${warnings} warnings`);
  console.log(`  Report: data/import-report.md`);
  for (const r of blocking) console.log(`  ⛔ row ${r.line} ${r.name}: ${r.errors.map((e) => `${e.field} ${e.message}`).join('; ')}`);
  if (strict && blocking.length) {
    console.error('⛔ Strict mode: approved cards with errors. Fix the sheet and run again.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('⛔', e instanceof Error ? e.message : e);
  process.exit(1);
});
