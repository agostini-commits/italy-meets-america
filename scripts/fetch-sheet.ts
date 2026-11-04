/**
 * npm run fetch-sheet — reads the "Companies" tab of the data sheet with the service account and writes
 * data/source/companies.csv (internal "_" columns dropped). Env: SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { API, gfetch, SCOPES } from './lib/google';
import { valuesToCsv } from './lib/sheet-csv';

const ROOT = new URL('..', import.meta.url).pathname;
const SHEET_ID = process.env.SHEET_ID ?? '15YCZ1CYHhVl9hOGppfjQOQt8_ToyUsPOeoBenA6RxKg';
const TAB = process.env.SHEET_TAB ?? 'Companies';

async function main() {
  const url = `${API.sheets}/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(`${TAB}!A1:ZZ`)}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`;
  const res = await gfetch(url, [SCOPES.sheets]);
  const { values = [] } = (await res.json()) as { values?: unknown[][] };
  if (!values.length) throw new Error(`The "${TAB}" tab is empty.`);
  const csv = valuesToCsv(values);
  await writeFile(join(ROOT, 'data/source/companies.csv'), csv);
  console.log(`✔ Sheet read: ${csv.trim().split('\n').length - 1} rows → data/source/companies.csv`);
}

main().catch((e) => {
  console.error('⛔', e instanceof Error ? e.message : e);
  process.exit(1);
});
