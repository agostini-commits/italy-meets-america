/** Yearbook order, shared by the import and its test. Pure. */
import { PACKAGE_INFO } from '../../src/schema';
import type { Company } from '../../src/types';

export function sortCompanies(list: Company[], sectors: string[]): Company[] {
  const pos = (s: string) => {
    const i = sectors.indexOf(s);
    return i < 0 ? 999 : i;
  };
  // Yearbook order (media kit): Front Cover Partners, then Priority Position, then everyone by sector.
  const rank = (c: Company) => PACKAGE_INFO[c.package].rank;
  return [...list].sort(
    (a, b) =>
      a.edition - b.edition ||
      rank(a) - rank(b) ||
      (rank(a) < 2 ? 0 : pos(a.sector) - pos(b.sector)) ||
      (a.sort_order ?? 9999) - (b.sort_order ?? 9999) ||
      a.name.localeCompare(b.name, 'en'),
  );
}
