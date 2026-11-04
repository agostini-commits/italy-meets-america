/**
 * npm run publish-log — writes the result of the publication in the "_Publish" tab of the data sheet
 * (created if missing), so who pressed "Publish to site" sees the outcome without opening GitHub.
 * Env: RESULT (success | failure | cancelled), REQUESTED_BY, SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON,
 * GITHUB_SERVER_URL / GITHUB_REPOSITORY / GITHUB_RUN_ID (set by GitHub Actions), SITE_URL.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { API as GAPI, gfetch, SCOPES } from './lib/google';
import { PUBLISH_HEADER, publishRow } from './lib/publish-row';

const ROOT = new URL('..', import.meta.url).pathname;
const SHEET_ID = process.env.SHEET_ID ?? '15YCZ1CYHhVl9hOGppfjQOQt8_ToyUsPOeoBenA6RxKg';
const TAB = '_Publish';
const API = `${GAPI.sheets}/v4/spreadsheets/${SHEET_ID}`;

async function main() {
  const reportPath = join(ROOT, 'data/import-report.json');
  const report = existsSync(reportPath) ? JSON.parse(await readFile(reportPath, 'utf8')) : null;
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : 'local';
  const row = publishRow({
    when: new Date(),
    requestedBy: process.env.REQUESTED_BY || 'unknown',
    ok: process.env.RESULT === 'success',
    report,
    runUrl,
    site: process.env.SITE_URL ?? '',
  });

  const meta = (await (await gfetch(`${API}?fields=sheets.properties.title`, [SCOPES.sheets])).json()) as { sheets: { properties: { title: string } }[] };
  if (!meta.sheets.some((s) => s.properties.title === TAB)) {
    await gfetch(`${API}:batchUpdate`, [SCOPES.sheets], {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TAB, gridProperties: { frozenRowCount: 1 } } } }] }),
    });
    await gfetch(`${API}/values/${encodeURIComponent(`${TAB}!A1`)}?valueInputOption=RAW`, [SCOPES.sheets], {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ values: [PUBLISH_HEADER] }),
    });
  }
  // RAW: texts from the sheet are never read as formulas.
  await gfetch(`${API}/values/${encodeURIComponent(`${TAB}!A:H`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, [SCOPES.sheets], {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  console.log(`✔ Result written in the sheet (${TAB}): ${row[2]}`);
}

main().catch((e) => {
  // The log must never hide the real result of the job.
  console.error('⚠ Could not write the result in the sheet:', e instanceof Error ? e.message : e);
});
