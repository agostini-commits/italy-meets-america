/**
 * Print plan: which sheets to print, in which order, with which page numbers. Pure (tests/print-plan.test.ts).
 *
 * Formats:
 * - magazine: every card = 2 A4 portrait pages (brand visual left, company page right); the Extended Profile
 *             adds 2 portfolio pages, one photo each (= 4);
 * - single:   every card = 1 A4 landscape page (photo 36%, text 64%); Extended Profile + 1 portfolio page.
 * The cover is A4 portrait in both formats.
 *
 * Page numbers are the position in the WHOLE yearbook (cover = page 1, not printed on the cover), so a
 * card keeps the same number whether you print everything or only a few cards.
 */
import { PACKAGE_INFO } from './schema';
import type { Company } from './types';

export type Format = 'magazine' | 'single';
export type SheetKind = 'cover' | 'photo' | 'text' | 'single' | 'gallery';

export interface Sheet {
  kind: SheetKind;
  company: Company | null;
  /** page number in the whole yearbook */
  page: number;
  /** gallery pages: which photos (indexes in company.gallery) */
  gallery?: number[];
  orientation: 'portrait' | 'landscape';
}

export const FORMATS: Record<Format, { label: string; note: string }> = {
  magazine: { label: 'Magazine', note: 'Two A4 portrait pages per company: photo on the left, text on the right.' },
  single: { label: 'Single sheet', note: 'One A4 landscape page per company: photo and text side by side.' },
};

/** Sheets of one card, without page numbers. */
function cardSheets(c: Company, format: Format): Omit<Sheet, 'page'>[] {
  const g = PACKAGE_INFO[c.package].portfolio ? c.gallery.map((_, i) => i) : [];
  if (format === 'magazine') {
    const out: Omit<Sheet, 'page'>[] = [
      { kind: 'photo', company: c, orientation: 'portrait' },
      { kind: 'text', company: c, orientation: 'portrait' },
    ];
    // Portfolio: always 2 pages (sold as such), one photo each; a missing photo leaves its page empty.
    for (let i = 0; i < PACKAGE_INFO[c.package].portfolio; i++)
      out.push({ kind: 'gallery', company: c, gallery: g.slice(i, i + 1), orientation: 'portrait' });
    return out;
  }
  const out: Omit<Sheet, 'page'>[] = [{ kind: 'single', company: c, orientation: 'landscape' }];
  if (PACKAGE_INFO[c.package].portfolio) out.push({ kind: 'gallery', company: c, gallery: g, orientation: 'landscape' });
  return out;
}

export function pagesPerCard(c: Company, format: Format): number {
  return cardSheets(c, format).length;
}

/**
 * @param all       every card of the edition, in yearbook order (used for the page numbers)
 * @param selected  ids to print
 */
export function planPrint(all: Company[], selected: Set<string>, format: Format, cover: boolean): Sheet[] {
  const sheets: Sheet[] = [];
  if (cover) sheets.push({ kind: 'cover', company: null, page: 1, orientation: 'portrait' });
  let page = 2; // page 1 is the cover, printed or not
  for (const c of all) {
    const own = cardSheets(c, format);
    if (selected.has(c.id)) own.forEach((s, i) => sheets.push({ ...s, page: page + i }));
    page += own.length;
  }
  return sheets;
}
