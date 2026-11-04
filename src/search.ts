/**
 * Index search: free text on name, city, region, buyers ("Who should connect"), US fairs and events,
 * products (signature, "What to discover", "What they bring to America") and sector; filters by sector and region.
 * Pure functions (tests in tests/search.test.ts).
 *
 * - accents and case do not count ("pâtisserie" = "patisserie");
 * - every word must be found (in any field): "wine new york" finds Bellavista;
 * - results keep the yearbook order (by sector), companies whose name matches come first;
 * - each result says where the words were found ("Fair: Vinitaly USA"), so a buyer sees why.
 */
import type { Company } from './types';

export interface Field {
  label: string;
  text: string;
  norm: string;
  /** shown under the result when it matches (name, city and sector are already visible) */
  explain: boolean;
}

export interface Entry {
  company: Company;
  fields: Field[];
}

export interface Query {
  q: string;
  sector: string;
  region: string;
}

export interface Result {
  company: Company;
  matches: { label: string; text: string }[];
}

export const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

export const tokens = (q: string): string[] => normalize(q).split(/[\s,;]+/).filter((t) => t.length > 0);

export function buildIndex(companies: Company[]): Entry[] {
  return companies.map((c) => {
    const f = (label: string, text: string, explain = true): Field => ({ label, text, norm: normalize(text), explain });
    return {
      company: c,
      fields: [
        f('Name', c.name, false),
        f('City', `${c.city} ${c.region}`, false),
        f('Sector', c.sector, false),
        f('Buyers', c.who_should_connect),
        ...c.us_events.map((e) => f('In the US', e.name)),
        f('Discover', c.what_to_discover),
        f('Brings to the US', c.what_they_bring),
        ...c.signature.map((s) => f('Signature', s)),
        f('Legal name', c.company_legal_name),
      ],
    };
  });
}

function matchEntry(e: Entry, words: string[]): Result | null {
  if (!words.length) return { company: e.company, matches: [] };
  for (const w of words) if (!e.fields.some((f) => f.norm.includes(w))) return null;
  const matches = e.fields.filter((f) => f.explain && words.some((w) => f.norm.includes(w))).map((f) => ({ label: f.label, text: f.text }));
  return { company: e.company, matches };
}

export function search(index: Entry[], query: Query): Result[] {
  const words = tokens(query.q);
  const out: Result[] = [];
  for (const e of index) {
    if (query.sector && e.company.sector !== query.sector) continue;
    if (query.region && e.company.region !== query.region) continue;
    const r = matchEntry(e, words);
    if (r) out.push(r);
  }
  if (!words.length) return out;
  // Name matches first, then the yearbook order (stable sort).
  const nameHit = (r: Result) => (words.some((w) => normalize(r.company.name).includes(w)) ? 0 : 1);
  return out.map((r, i) => ({ r, i })).sort((a, b) => nameHit(a.r) - nameHit(b.r) || a.i - b.i).map((x) => x.r);
}

/** Counts per sector and per region, each one with the other filters applied (so a count is what you get). */
export function facets(index: Entry[], query: Query) {
  const count = (key: 'sector' | 'region') => {
    const m = new Map<string, number>();
    const q = { ...query, [key]: '' };
    for (const r of search(index, q)) m.set(r.company[key], (m.get(r.company[key]) ?? 0) + 1);
    return m;
  };
  return { sectors: count('sector'), regions: count('region') };
}
