import type { Company, Edition, ImageInfo } from './types';

export interface EditionData {
  edition: Edition;
  companies: Company[];
  images: Record<string, ImageInfo>;
}

let editionsCache: Promise<Edition[]> | null = null;
const cache = new Map<number, Promise<EditionData>>();

async function getJson<T>(url: string, fallback?: T): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    if (fallback !== undefined) return fallback;
    throw new Error(`${url}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function loadEditions(): Promise<Edition[]> {
  editionsCache ??= getJson<Edition[]>('/data/editions.json');
  return editionsCache;
}

export async function currentEdition(): Promise<Edition | undefined> {
  const list = await loadEditions();
  return list.find((e) => e.current) ?? list[list.length - 1];
}

export function loadEdition(year: number): Promise<EditionData> {
  if (!cache.has(year)) {
    cache.set(
      year,
      (async () => {
        // The three files in parallel: the year is already in the address (the photo is found sooner).
        const [editions, companies, images] = await Promise.all([
          loadEditions(),
          getJson<Company[]>(`/data/${year}/companies.json`),
          getJson<Record<string, ImageInfo>>(`/img/${year}/manifest.json`, {}),
        ]);
        const edition = editions.find((e) => e.edition === year);
        if (!edition) throw new Error(`Edition ${year} not found`);
        return { edition, companies, images };
      })(),
    );
    cache.get(year)!.catch(() => cache.delete(year));
  }
  return cache.get(year)!;
}

/** Front Cover Partners, in yearbook order (their names go on the cover, max 3). */
export const coverPartners = (companies: Company[]) => companies.filter((c) => c.package === 'cover_partner');

/**
 * Contents of the yearbook, in reading order: "Featured" (Front Cover Partners and Priority Position,
 * which the import puts first), then the other companies by sector.
 */
export function sections(companies: Company[]): [string, Company[]][] {
  const featured = companies.filter((c) => c.package === 'cover_partner' || c.package === 'priority');
  const rest = bySector(companies.filter((c) => !featured.includes(c)));
  return featured.length ? [['Featured', featured], ...rest] : rest;
}

/** Companies grouped by sector, in the order of the data (import sorts by sector list). */
export function bySector(companies: Company[]): [string, Company[]][] {
  const map = new Map<string, Company[]>();
  for (const c of companies) map.set(c.sector, [...(map.get(c.sector) ?? []), c]);
  return [...map];
}
