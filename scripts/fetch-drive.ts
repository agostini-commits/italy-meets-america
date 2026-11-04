/**
 * npm run fetch-drive — downloads from the Drive photo folder only the files named in the sheet
 * (logo, photo, gallery_1..6, edition covers) into media/originals.
 * - Subfolders are read too (e.g. one folder per company).
 * - A file already downloaded with the same md5 is skipped; the file date is set to the Drive
 *   date, so `npm run images` only reprocesses new or changed photos.
 * - Names written in the sheet but not found on Drive are listed (the import report flags them too).
 * Env: DRIVE_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_JSON.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCompaniesCsv } from './lib/csv';
import { API as GAPI, gfetch, SCOPES } from './lib/google';
import { referencedFiles } from './lib/sheet-csv';
import type { Edition } from '../src/types';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'media/originals');
const CACHE = join(ROOT, 'media/.drive-cache.json');
const FOLDER = process.env.DRIVE_FOLDER_ID;
const API = `${GAPI.drive}/drive/v3/files`;
const FOLDER_MIME = 'application/vnd.google-apps.folder';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  md5Checksum?: string;
  size?: string;
  modifiedTime: string;
}

async function listFolder(folder: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  const queue = [folder];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    let pageToken = '';
    do {
      const q = new URLSearchParams({
        q: `'${id}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, md5Checksum, size, modifiedTime)',
        pageSize: '1000',
        orderBy: 'modifiedTime desc',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        ...(pageToken ? { pageToken } : {}),
      });
      const res = await gfetch(`${API}?${q}`, [SCOPES.driveRead]);
      const body = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
      for (const f of body.files) (f.mimeType === FOLDER_MIME ? queue.push(f.id) : out.push(f));
      pageToken = body.nextPageToken ?? '';
    } while (pageToken);
  }
  return out;
}

async function main() {
  if (!FOLDER) throw new Error('DRIVE_FOLDER_ID is not set (GitHub variable with the id of the photo folder).');
  const csv = await readFile(join(ROOT, 'data/source/companies.csv'), 'utf8');
  const editions: Edition[] = JSON.parse(await readFile(join(ROOT, 'config/editions.json'), 'utf8'));
  const wanted = referencedFiles(parseCompaniesCsv(csv).rows.map((r) => r.row), editions.map((e) => e.cover_photo));

  // A folder not shared with the service account lists as EMPTY (no error): check it first, or the
  // site would be published with no photos and nobody would know why.
  await gfetch(`${API}/${FOLDER}?fields=id,name&supportsAllDrives=true`, [SCOPES.driveRead]);
  const files = await listFolder(FOLDER);
  // Same name in two places: the most recent wins (list is ordered by date), and we say so.
  const byName = new Map<string, DriveFile>();
  const dup = new Set<string>();
  for (const f of files) (byName.has(f.name) ? dup.add(f.name) : byName.set(f.name, f));

  await mkdir(OUT, { recursive: true });
  const cache: Record<string, string> = existsSync(CACHE) ? JSON.parse(await readFile(CACHE, 'utf8')) : {};
  let downloaded = 0;
  let unchanged = 0;
  const missing: string[] = [];

  for (const name of wanted) {
    const f = byName.get(name);
    if (!f) {
      missing.push(name);
      continue;
    }
    if (/[/\\]/.test(name)) throw new Error(`Unsafe file name on Drive: ${name}`);
    const path = join(OUT, name);
    const stamp = f.md5Checksum ?? `${f.size}-${f.modifiedTime}`;
    if (existsSync(path) && cache[name] === stamp) {
      unchanged++;
      continue;
    }
    const res = await gfetch(`${API}/${f.id}?alt=media&supportsAllDrives=true`, [SCOPES.driveRead]);
    const tmp = `${path}.part`;
    await writeFile(tmp, Buffer.from(await res.arrayBuffer()));
    await rename(tmp, path);
    const t = new Date(f.modifiedTime);
    await utimes(path, t, t);
    cache[name] = stamp;
    downloaded++;
  }
  await writeFile(CACHE, JSON.stringify(cache, null, 1));

  console.log(`✔ Drive: ${downloaded} downloaded, ${unchanged} unchanged, ${missing.length} not found (of ${wanted.length} named in the sheet)`);
  for (const n of missing) console.log(`  ⚠ not on Drive: ${n}`);
  for (const n of dup) console.log(`  ⚠ two files called "${n}" on Drive: the most recent one is used`);
}

main().catch((e) => {
  console.error('⛔', e instanceof Error ? e.message : e);
  process.exit(1);
});
