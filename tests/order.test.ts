import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sortCompanies } from '../scripts/lib/order';
import { coverPartners, sections } from '../src/data';
import type { Company } from '../src/types';

const lists = JSON.parse(readFileSync(new URL('../config/lists.json', import.meta.url), 'utf8'));
const sample: Company[] = JSON.parse(readFileSync(new URL('../data/companies.json', import.meta.url), 'utf8'));
const co = (id: string, pkg: Company['package'], sector: string, sort: number | null = null): Company =>
  ({ ...sample[0], id, name: id, package: pkg, sector, sort_order: sort });

describe('yearbook order (media kit)', () => {
  const list = [
    co('wine-a', 'corporate', 'Wine & Spirits'),
    co('food-ext', 'extended', 'Food & Beverage'),
    co('prio-2', 'priority', 'Art & Culture', 2),
    co('cover-1', 'cover_partner', 'Wine & Spirits'),
    co('prio-1', 'priority', 'Wine & Spirits', 1),
    co('food-a', 'corporate', 'Food & Beverage', 1),
  ];
  const sorted = sortCompanies(list, lists.sectors);
  it('Front Cover Partners, then Priority Position (by sort_order), then everyone by sector', () => {
    expect(sorted.map((c) => c.id)).toEqual(['cover-1', 'prio-1', 'prio-2', 'food-a', 'food-ext', 'wine-a']);
  });
  it('contents: "Featured" first, then the sectors', () => {
    expect(sections(sorted).map(([s, l]) => `${s}:${l.map((c) => c.id).join(',')}`)).toEqual([
      'Featured:cover-1,prio-1,prio-2', 'Food & Beverage:food-a,food-ext', 'Wine & Spirits:wine-a',
    ]);
    expect(coverPartners(sorted).map((c) => c.id)).toEqual(['cover-1']);
  });
  it('no featured companies: only the sectors', () => {
    expect(sections(sample).map(([s]) => s)).toEqual(['Food & Beverage', 'Fashion & Luxury']);
  });
});
