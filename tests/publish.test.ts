import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseCompaniesCsv } from '../scripts/lib/csv';
import { signedJwt } from '../scripts/lib/google';
import { publishRow } from '../scripts/lib/publish-row';
import { referencedFiles, valuesToCsv } from '../scripts/lib/sheet-csv';

describe('sheet → CSV', () => {
  const values = [
    ['id', 'name', 'intro', '_client_contact_email', 'photo', '_internal_notes'],
    ['a-b', 'A "B"', 'Line, with comma\nand new line', 'secret@client.it', 'a.jpg', 'do not publish'],
    ['', '', '', '', '', ''], // empty row of the sheet
    ['c', 'C'], // short row (trailing empty cells are not returned by the API)
  ];
  const csv = valuesToCsv(values);
  it('drops the internal columns: they never reach the repository', () => {
    expect(csv).not.toContain('secret@client.it');
    expect(csv).not.toContain('do not publish');
    expect(csv.split('\n')[0]).toBe('id,name,intro,photo');
  });
  it('escapes quotes, commas and new lines, skips empty rows', () => {
    const p = parseCompaniesCsv(csv);
    expect(p.rows.map((r) => r.row.name)).toEqual(['A "B"', 'C']);
    expect(p.rows[0].row.intro).toBe('Line, with comma\nand new line');
    expect(p.rows[1].row.photo).toBe('');
  });
  it('lists the files to download, once, with the covers', () => {
    const rows: Record<string, string>[] = [{ logo: 'a-logo.svg', photo: 'a.jpg', gallery_1: 'g1.jpg' }, { photo: 'a.jpg', logo: '' }];
    expect(referencedFiles(rows, ['cover.jpg'])).toEqual(['a-logo.svg', 'a.jpg', 'cover.jpg', 'g1.jpg']);
  });
});

describe('Google service account', () => {
  it('signs a valid RS256 JWT with the right claims', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const key = { client_email: 'publisher@project.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
    const jwt = signedJwt(key, ['s1', 's2'], 1_800_000_000);
    const [h, p, s] = jwt.split('.');
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(p, 'base64url').toString())).toEqual({
      iss: key.client_email, scope: 's1 s2', aud: 'https://oauth2.googleapis.com/token', iat: 1_800_000_000, exp: 1_800_003_600,
    });
    expect(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true);
  });
});

describe('publish log row', () => {
  const report = {
    published: 2,
    rows: [
      { line: 2, name: 'A', status: 'approved', errors: [], warnings: [{ field: 'photo', message: 'small' }], published: true },
      { line: 3, name: 'B', status: 'approved', errors: [{ field: 'intro', message: '731/730' }], warnings: [], published: false },
      { line: 4, name: 'C', status: 'draft', errors: [{ field: 'mission', message: 'missing' }], warnings: [], published: false },
    ],
  };
  const when = new Date('2026-11-04T17:30:00Z');
  it('ok: counts, only approved rows with errors, first errors in words', () => {
    const r = publishRow({ when, requestedBy: 'agostini@bfcmedia.com', ok: true, report, runUrl: 'https://run', site: 'https://site' });
    expect(r).toEqual(['04/11/26, 18:30', 'agostini@bfcmedia.com', 'OK', 2, '1: row 3 B: intro 731/730', 1, 'https://run', 'https://site']);
  });
  it('failed before the checks (e.g. sheet not shared)', () => {
    const r = publishRow({ when, requestedBy: 'x', ok: false, report: null, runUrl: 'https://run', site: 'https://site' });
    expect(r[2]).toBe('FAILED (before the checks)');
    expect(r[7]).toBe('');
  });
});
