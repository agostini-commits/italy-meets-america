import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildIndex, facets, normalize, search } from '../src/search';
import { highlight, snippet } from '../src/lib/snippet';
import type { Company } from '../src/types';

const companies: Company[] = JSON.parse(readFileSync(new URL('../data/companies.json', import.meta.url), 'utf8'));
const index = buildIndex(companies);
const ids = (q: string, sector = '', region = '') => search(index, { q, sector, region }).map((r) => r.company.id);

describe('index search', () => {
  it('no query: everything, in yearbook order', () => {
    expect(ids('')).toEqual(companies.map((c) => c.id));
  });
  it('name, city, region', () => {
    expect(ids('marinella')).toEqual(['e-marinella']);
    expect(ids('naples')).toEqual(['e-marinella']);
    expect(ids('piedmont')).toEqual(['domori']);
  });
  it('buyers and fairs', () => {
    expect(ids('sommeliers')).toEqual(['bellavista']);
    expect(ids('fancy food')).toEqual(['domori']);
    expect(ids('vinitaly')).toEqual(['bellavista']);
  });
  it('accents and case do not count', () => {
    expect(normalize('Pâtisserie CUVÉE')).toBe('patisserie cuvee');
    expect(ids('patisserie')).toEqual(['domori']);
    expect(ids('CUVEES')).toEqual(['bellavista']);
  });
  it('every word must match, in any field', () => {
    expect(ids('wine new york')).toEqual(['bellavista']);
    expect(ids('wine chocolate')).toEqual([]);
  });
  it('finds what they bring to America', () => {
    expect(ids('department stores')).toEqual(['e-marinella']);
    expect(ids('collectors')).toEqual(['bellavista']);
  });
  it('explains where it matched', () => {
    const r = search(index, { q: 'chicago', sector: '', region: '' });
    expect(r[0].matches).toEqual([{ label: 'In the US', text: 'Chicago Collective Menswear Show' }]);
  });
  it('filters and counts', () => {
    expect(ids('', 'Food & Beverage')).toEqual(['bellavista', 'domori']);
    expect(ids('', 'Food & Beverage', 'Piedmont')).toEqual(['domori']);
    expect(ids('hospitality', '', 'Lombardy')).toEqual(['bellavista']);
    const f = facets(index, { q: 'hospitality', sector: '', region: '' });
    expect(Object.fromEntries(f.sectors)).toEqual({ 'Food & Beverage': 2 });
    const g = facets(index, { q: '', sector: 'Food & Beverage', region: '' });
    expect(Object.fromEntries(g.regions)).toEqual({ Lombardy: 1, Piedmont: 1 });
  });
  it('name matches come first, then the yearbook order', () => {
    expect(ids('luxury')).toEqual(['domori', 'e-marinella']); // no name hit: yearbook order
    const fake = { ...companies.find((c) => c.id === 'domori')!, id: 'luxury-co', name: 'Luxury Co' };
    const r = search(buildIndex([...companies, fake]), { q: 'luxury', sector: '', region: '' });
    expect(r.map((x) => x.company.id)).toEqual(['luxury-co', 'domori', 'e-marinella']);
  });
  it('snippet: short texts as they are, long ones around the word', () => {
    expect(snippet('Short text', ['short'])).toBe('Short text');
    const long = companies.find((c) => c.id === 'domori')!.what_they_bring;
    const s = snippet(long, ['hospitality']);
    expect(s.length).toBeLessThanOrEqual(116);
    expect(s).toContain('hospitality');
    expect(s.startsWith('… ')).toBe(true);
  });
  it('highlight escapes the text and marks the words', () => {
    expect(highlight('Wine & <Spirits>', ['wine'])).toBe('<mark>Wine</mark> &amp; &lt;Spirits&gt;');
  });
});
