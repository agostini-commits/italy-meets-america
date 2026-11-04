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
  it('gallery only for premium; premium without gallery is a warning', () => {
    const base = bellavista();
    base.gallery_1 = 'a.jpg';
    expect(validateRow(base, 2, lists).errors[0].field).toBe('gallery_1');
    const premium = bellavista();
    premium.package = 'premium';
    const r = validateRow(premium, 2, lists);
    expect(r.errors).toEqual([]);
    expect(r.warnings[0].field).toBe('gallery_1');
    expect(r.company?.pages).toBe(4);
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
