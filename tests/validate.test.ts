import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCompaniesCsv } from '../scripts/lib/csv';
import { crossCheck, matchList, parseIntro, sectorKey, validateRow, type Row } from '../scripts/lib/validate';

const lists = JSON.parse(readFileSync(new URL('../config/lists.json', import.meta.url), 'utf8'));
const csv = readFileSync(new URL('../data/source/companies.csv', import.meta.url), 'utf8');
const parsed = parseCompaniesCsv(csv);
const bellavista = (): Row => ({ ...parsed.rows[0].row });

describe('CSV from the Google Sheet', () => {
  it('has all the columns and skips the internal ones', () => {
    expect(parsed.missingColumns).toEqual([]);
    expect(parsed.unknownColumns).toEqual([]);
    expect(Object.keys(parsed.rows[0].row).some((k) => k.startsWith('_'))).toBe(false);
  });
  it('the three sample companies are valid', () => {
    const r = parsed.rows.map(({ row, line }) => validateRow(row, line, lists));
    for (const x of r) expect(x.errors).toEqual([]);
    expect(r.map((x) => x.company?.id)).toEqual(['bellavista', 'e-marinella', 'domori']);
    expect(r[0].company?.pages).toBe(2);
    expect(r[0].company?.us_events).toHaveLength(3);
    expect(r[0].company?.website_label).toBe('bellavista.it');
  });
});

describe('intro', () => {
  it('splits the bold passage', () => {
    const p = parseIntro('Before **bold** after');
    expect(p.parts).toEqual([
      { text: 'Before ', bold: false },
      { text: 'bold', bold: true },
      { text: ' after', bold: false },
    ]);
    expect(p.plain).toBe('Before bold after');
  });
  it('refuses two bold passages and unclosed markers', () => {
    expect(parseIntro('**a** and **b**').error).toMatch(/only one/);
    expect(parseIntro('**a and b').error).toMatch(/not closed/);
  });
  it('the 730 limit does not count the markers', () => {
    const row = bellavista();
    row.intro = '**' + 'a'.repeat(730) + '**';
    expect(validateRow(row, 2, lists).errors).toEqual([]);
    row.intro = 'a'.repeat(731);
    expect(validateRow(row, 2, lists).errors[0]).toMatchObject({ field: 'intro', message: expect.stringMatching(/731\/730/) });
  });
});

describe('limits and required fields', () => {
  it('reports texts over the limit and missing fields, and does not publish', () => {
    const row = bellavista();
    row.mission = 'x'.repeat(61);
    row.quote_author = '';
    const r = validateRow(row, 2, lists);
    expect(r.company).toBeNull();
    expect(r.errors.map((e) => e.field)).toEqual(['mission', 'quote_author']);
  });
  it('checks slug, emails, https and founding year', () => {
    const row = bellavista();
    Object.assign(row, { id: 'Bella Vista', email_2: 'not-an-email', website: 'bellavista.it', since: '2031', social_instagram: 'http://instagram.com/x' });
    const fields = validateRow(row, 2, lists).errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['id', 'email_2', 'website', 'since', 'social_instagram']));
  });
  it('the four packages of the media kit: pages and portfolio', () => {
    for (const [pkg, pages] of [['corporate', 2], ['priority', 2], ['extended', 4], ['cover_partner', 2]] as const) {
      const row = { ...bellavista(), package: pkg, gallery_1: pkg === 'extended' ? 'a.jpg' : '', gallery_2: pkg === 'extended' ? 'b.jpg' : '' };
      const r = validateRow(row, 2, lists);
      expect(r.errors).toEqual([]);
      expect(r.company?.pages).toBe(pages);
    }
    expect(validateRow({ ...bellavista(), package: 'gold' }, 2, lists).errors[0].field).toBe('package');
  });
  it('portfolio only for the Extended Profile, 2 photos at most; missing photos are a warning', () => {
    expect(validateRow({ ...bellavista(), gallery_1: 'a.jpg' }, 2, lists).errors[0].field).toBe('gallery_1');
    const one = validateRow({ ...bellavista(), package: 'extended', gallery_1: 'a.jpg' }, 2, lists);
    expect(one.errors).toEqual([]);
    expect(one.warnings.map((w) => w.field)).toContain('gallery_1');
    const three = validateRow({ ...bellavista(), package: 'extended', gallery_1: 'a.jpg', gallery_2: 'b.jpg', gallery_3: 'c.jpg' }, 2, lists);
    expect(three.errors.map((e) => e.field)).toEqual(['gallery_3']);
  });
  it('old package names still work, with a warning', () => {
    const r = validateRow({ ...bellavista(), package: 'base' }, 2, lists);
    expect(r.company?.package).toBe('corporate');
    expect(r.warnings.map((w) => w.field)).toContain('package');
    expect(validateRow({ ...bellavista(), package: 'premium', gallery_1: 'a.jpg', gallery_2: 'b.jpg' }, 2, lists).company?.package).toBe('extended');
  });
  it('at most 3 Front Cover Partners per edition', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id, i) => validateRow({ ...bellavista(), id, name: id.toUpperCase(), package: 'cover_partner' }, i + 2, lists));
    crossCheck(rows);
    expect(rows.map((r) => r.errors.length)).toEqual([0, 0, 0, 1]);
    expect(rows[3].errors[0].field).toBe('package');
    expect(rows[3].company).toBeNull();
  });
});

describe('sectors and regions written in different ways', () => {
  it('same key', () => {
    expect(sectorKey('Food and beverage ')).toBe(sectorKey('FOOD & BEVERAGE'));
  });
  it('auto-corrects with a warning, refuses with a suggestion', () => {
    const row = bellavista();
    row.sector = 'food and beverage';
    row.region = 'Lombardia';
    const r = validateRow(row, 2, lists);
    expect(r.company?.sector).toBe('Food & Beverage');
    expect(r.company?.region).toBe('Lombardy');
    expect(r.warnings.map((w) => w.field)).toEqual(['sector', 'region']);
    expect(matchList('Fashon & Luxury', lists.sectors).suggestion).toBe('Fashion & Luxury');
  });
});

describe('across rows', () => {
  it('duplicate id in the same edition', () => {
    const r = [validateRow(bellavista(), 2, lists), validateRow(bellavista(), 3, lists)];
    crossCheck(r);
    expect(r[0].company).not.toBeNull();
    expect(r[1].company).toBeNull();
    expect(r[1].errors[0].message).toMatch(/row 2/);
  });
  it('same id in another edition is fine', () => {
    const next = bellavista();
    next.edition = '2027';
    const r = [validateRow(bellavista(), 2, lists), validateRow(next, 3, lists)];
    crossCheck(r);
    expect(r[1].company).not.toBeNull();
  });
});
