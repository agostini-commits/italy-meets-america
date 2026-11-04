import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { planPrint } from '../src/print-plan';
import type { Company } from '../src/types';

const base: Company[] = JSON.parse(readFileSync(new URL('../data/companies.json', import.meta.url), 'utf8'));
const premium: Company = { ...base[1], id: 'premium-co', package: 'premium', pages: 4, gallery: ['a', 'b', 'c', 'd', 'e'].map((f) => ({ file: `${f}.jpg`, alt: f })) };
const all = [base[0], premium, base[2]];
const ids = (...x: string[]) => new Set(x);
const summary = (s: ReturnType<typeof planPrint>) => s.map((x) => `${x.page}:${x.kind}${x.company ? `:${x.company.id}` : ''}${x.gallery ? `[${x.gallery.join('')}]` : ''}`);

describe('print plan', () => {
  it('magazine: cover + 2 pages per base card, 4 per premium (gallery split in two)', () => {
    expect(summary(planPrint(all, ids('bellavista', 'premium-co', 'e-marinella'), 'magazine', true))).toEqual([
      '1:cover', '2:photo:bellavista', '3:text:bellavista',
      '4:photo:premium-co', '5:text:premium-co', '6:gallery:premium-co[012]', '7:gallery:premium-co[34]',
      '8:photo:e-marinella', '9:text:e-marinella',
    ]);
  });
  it('single sheet: 1 page per base card, 2 per premium', () => {
    expect(summary(planPrint(all, ids('bellavista', 'premium-co', 'e-marinella'), 'single', false))).toEqual([
      '2:single:bellavista', '3:single:premium-co', '4:gallery:premium-co[01234]', '5:single:e-marinella',
    ]);
  });
  it('page numbers are those of the whole yearbook, whatever is selected', () => {
    expect(summary(planPrint(all, ids('e-marinella'), 'magazine', false))).toEqual(['8:photo:e-marinella', '9:text:e-marinella']);
  });
  it('orientation follows the format', () => {
    const s = planPrint(all, ids('bellavista'), 'single', true);
    expect(s.map((x) => x.orientation)).toEqual(['portrait', 'landscape']);
  });
  it('nothing selected, no cover: no sheets', () => {
    expect(planPrint(all, ids(), 'magazine', false)).toEqual([]);
  });
});
