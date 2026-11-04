/**
 * Validation of one row of the sheet. Pure functions: no files, no network (tests in tests/validate.test.ts).
 *
 * - error   → the card is NOT published (it would break the layout or the links);
 * - warning → the card is published, but someone should look at it (low-res photo, auto-corrected sector…).
 */
import { LIMITS, MAX, PACKAGES, PUBLIC_STATUSES, SOCIALS, STATUSES } from '../../src/schema';
import type { Company, Package, Social, Status, TextPart, UsEvent } from '../../src/types';

export type Row = Record<string, string>;

export interface Issue {
  field: string;
  message: string;
}

export interface RowResult {
  line: number; // line in the CSV (header = 1)
  id: string;
  edition: number | null;
  name: string;
  status: string;
  errors: Issue[];
  warnings: Issue[];
  company: Company | null;
}

export interface Lists {
  sectors: string[];
  regions: string[];
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/** Italian region names → the English ones used in the app. */
const REGIONS_IT: Record<string, string> = {
  "valle d'aosta": 'Aosta Valley', 'valle d aosta': 'Aosta Valley', puglia: 'Apulia', lombardia: 'Lombardy',
  piemonte: 'Piedmont', sardegna: 'Sardinia', sicilia: 'Sicily', toscana: 'Tuscany',
  'trentino-alto adige': 'Trentino-South Tyrol', 'trentino alto adige': 'Trentino-South Tyrol',
  'friuli-venezia giulia': 'Friuli Venezia Giulia',
};

/** "Food and beverage", "food & Beverage ", "FOOD&BEVERAGE" → same key. */
export function sectorKey(s: string): string {
  return s.toLowerCase().replace(/\band\b/g, '&').replace(/[^a-z0-9&]/g, '');
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Matches a value against a list: exact, same key (auto-fix), or a suggestion. */
export function matchList(value: string, list: string[], key = sectorKey) {
  if (list.includes(value)) return { value, fixed: false, suggestion: null as string | null };
  const k = key(value);
  const same = list.find((x) => key(x) === k);
  if (same) return { value: same, fixed: true, suggestion: null };
  let best: string | null = null;
  let bestD = Infinity;
  for (const x of list) {
    const dist = levenshtein(key(x), k);
    if (dist < bestD) [best, bestD] = [x, dist];
  }
  return { value: null, fixed: false, suggestion: bestD <= Math.max(3, k.length / 4) ? best : null };
}

/** Splits the intro on **…**: at most one bold passage, markers must be closed. */
export function parseIntro(raw: string): { parts: TextPart[]; plain: string; error: string | null } {
  const markers = raw.split('**').length - 1;
  const plain = raw.replaceAll('**', '');
  if (markers === 0) return { parts: [{ text: raw, bold: false }], plain, error: null };
  if (markers % 2 !== 0) return { parts: [{ text: plain, bold: false }], plain, error: 'the ** markers are not closed' };
  if (markers > 2) return { parts: [{ text: plain, bold: false }], plain, error: 'only one bold passage is allowed' };
  const parts = raw
    .split('**')
    .map((text, i) => ({ text, bold: i % 2 === 1 }))
    .filter((p) => p.text !== '');
  return { parts, plain, error: null };
}

const clean = (v: string | undefined) => (v ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const isHttps = (v: string) => /^https:\/\/[^\s]+\.[^\s]+$/.test(v);

export function validateRow(row: Row, line: number, lists: Lists): RowResult {
  const get = (k: string) => clean(row[k]);
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (field: string, message: string) => errors.push({ field, message });
  const warn = (field: string, message: string) => warnings.push({ field, message });

  const required = (k: string) => {
    const v = get(k);
    if (!v) err(k, 'missing');
    return v;
  };
  const limited = (k: string, max: number, isRequired = true) => {
    const v = isRequired ? required(k) : get(k);
    if (v.length > max) err(k, `${v.length}/${max} characters (${v.length - max} too many)`);
    return v;
  };

  // --- identity -----------------------------------------------------------
  const id = get('id');
  if (!id) err('id', 'missing');
  else if (!SLUG.test(id)) err('id', `"${id}" is not a valid slug (use lowercase letters, numbers and dashes, e.g. ${slugify(id) || 'company-name'})`);

  const editionRaw = get('edition');
  const edition = Number(editionRaw);
  if (!Number.isInteger(edition) || edition < 2026 || edition > 2100) err('edition', `"${editionRaw}" is not a valid year`);

  const status = get('status') as Status;
  if (!STATUSES.includes(status)) err('status', `"${status}" not valid (${STATUSES.join(', ')})`);

  const pkg = get('package') as Package;
  if (!PACKAGES.includes(pkg)) err('package', `"${pkg}" not valid (base or premium)`);

  const sortRaw = get('sort_order');
  const sortOrder = sortRaw === '' ? null : Number(sortRaw);
  if (sortOrder !== null && !Number.isFinite(sortOrder)) err('sort_order', `"${sortRaw}" is not a number`);

  // --- sector and region: auto-fix spelling, error if unknown -----------------
  let sector = required('sector');
  if (sector) {
    const m = matchList(sector, lists.sectors);
    if (m.value && m.fixed) warn('sector', `written "${sector}", corrected to "${m.value}": fix it in the sheet`);
    if (!m.value) err('sector', `"${sector}" is not in the list${m.suggestion ? ` (did you mean "${m.suggestion}"?)` : ''}`);
    sector = m.value ?? sector;
  }
  let region = required('region');
  if (region) {
    const it = REGIONS_IT[region.toLowerCase()];
    const m = it ? { value: it, fixed: true, suggestion: null } : matchList(region, lists.regions);
    if (m.value && m.fixed) warn('region', `written "${region}", corrected to "${m.value}": fix it in the sheet`);
    if (!m.value) err('region', `"${region}" is not in the list${m.suggestion ? ` (did you mean "${m.suggestion}"?)` : ''}`);
    region = m.value ?? region;
  }

  // --- texts ---------------------------------------------------------------
  const name = required('name');
  const city = required('city');
  const headline = limited('headline', LIMITS.headline);

  const introRaw = required('intro');
  const intro = parseIntro(introRaw);
  if (intro.error) err('intro', intro.error);
  if (intro.plain.length > LIMITS.intro) err('intro', `${intro.plain.length}/${LIMITS.intro} characters (${intro.plain.length - LIMITS.intro} too many)`);

  const mission = limited('mission', LIMITS.mission);
  const vision = limited('vision', LIMITS.vision);
  const quote = limited('quote', LIMITS.quote).replace(/^["“”]+|["“”]+$/g, '');
  if (/^["“”]|["“”]$/.test(get('quote'))) warn('quote', 'quotation marks removed: the layout adds them');
  const quoteAuthor = required('quote_author');
  const quoteRole = get('quote_role') || null;
  const who = limited('who_should_connect', LIMITS.who_should_connect);
  const what = limited('what_to_discover', LIMITS.what_to_discover);

  const sinceRaw = required('since');
  const since = Number(sinceRaw);
  if (sinceRaw && (!/^\d{4}$/.test(sinceRaw) || since < 1700 || (Number.isInteger(edition) && since > edition)))
    err('since', `"${sinceRaw}" is not a valid founding year`);

  const signature: string[] = [];
  for (let i = 1; i <= MAX.signatures; i++) {
    const v = limited(`signature_${i}`, LIMITS.signature, i === 1);
    if (v) signature.push(v);
  }

  const usEvents: UsEvent[] = [];
  for (let i = 1; i <= MAX.usEvents; i++) {
    const n = limited(`us_event_${i}_name`, LIMITS.us_event_name, false);
    const u = get(`us_event_${i}_url`);
    if (u && !n) err(`us_event_${i}_url`, 'URL without the event name');
    if (u && !isHttps(u)) err(`us_event_${i}_url`, `"${u}" must start with https://`);
    if (n) usEvents.push({ name: n, url: u || null });
  }

  const whatTheyBring = limited('what_they_bring', LIMITS.what_they_bring);

  // --- contacts ------------------------------------------------------------
  const legal = required('company_legal_name');
  const street = required('address_street');
  const addrCity = required('address_city');
  const country = required('country');

  const emails: string[] = [];
  for (let i = 1; i <= MAX.emails; i++) {
    const v = i === 1 ? required(`email_${i}`) : get(`email_${i}`);
    if (v && !EMAIL.test(v)) err(`email_${i}`, `"${v}" is not a valid email`);
    if (v) emails.push(v.toLowerCase());
  }

  const website = required('website');
  if (website && !isHttps(website)) err('website', `"${website}" must start with https://`);

  const social: Partial<Record<Social, string>> = {};
  for (const s of SOCIALS) {
    const v = get(`social_${s}`);
    if (!v) continue;
    if (!isHttps(v)) err(`social_${s}`, `"${v}" must start with https://`);
    else social[s] = v;
  }

  // --- images --------------------------------------------------------------
  const logo = required('logo');
  const photo = required('photo');
  const photoAlt = limited('photo_alt', LIMITS.photo_alt);
  const gallery: { file: string; alt: string }[] = [];
  for (let i = 1; i <= MAX.gallery; i++) {
    const v = get(`gallery_${i}`);
    if (v) gallery.push({ file: v, alt: `${name}, image ${i}` });
  }
  if (pkg === 'base' && gallery.length) err('gallery_1', 'the gallery is only for premium cards');
  if (pkg === 'premium' && !gallery.length) warn('gallery_1', 'premium card without gallery');
  for (const f of [logo, photo, ...gallery.map((g) => g.file)])
    if (f && /[\s/\\]/.test(f)) err('images', `"${f}": file names cannot contain spaces or slashes`);

  const company: Company | null = errors.length
    ? null
    : {
        id,
        edition,
        status,
        package: pkg,
        sort_order: sortOrder,
        sector,
        sector_slug: slugify(sector),
        name,
        city,
        region,
        headline,
        intro: intro.plain,
        intro_parts: intro.parts,
        mission,
        vision,
        quote,
        quote_author: quoteAuthor,
        quote_role: quoteRole,
        who_should_connect: who,
        what_to_discover: what,
        since,
        signature,
        us_events: usEvents,
        what_they_bring: whatTheyBring,
        company_legal_name: legal,
        address: { street, city: addrCity, country },
        emails,
        website,
        website_label: website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
        social,
        logo,
        photo: { file: photo, alt: photoAlt, credit: get('photo_credit') || null },
        gallery,
        pages: pkg === 'premium' ? 4 : 2,
      };

  return { line, id, edition: Number.isInteger(edition) ? edition : null, name, status, errors, warnings, company };
}

/** Checks across rows: duplicate ids in the same edition, sector variants. */
export function crossCheck(results: RowResult[]): void {
  const seen = new Map<string, RowResult>();
  for (const r of results) {
    if (!r.id) continue;
    const key = `${r.edition ?? ''}|${r.id}`;
    const first = seen.get(key);
    if (first) {
      r.errors.push({ field: 'id', message: `duplicate: same id as row ${first.line}` });
      r.company = null;
    } else seen.set(key, r);
  }
}

export const isPublic = (status: string) => (PUBLIC_STATUSES as readonly string[]).includes(status);
