import { parse } from 'csv-parse/sync';
import type { Row } from './validate';

/** Columns the sheet must have (internal columns starting with "_" are ignored). */
export const EXPECTED_COLUMNS = [
  'id', 'edition', 'status', 'package', 'sort_order', 'sector', 'name', 'city', 'region', 'headline', 'intro',
  'mission', 'vision', 'quote', 'quote_author', 'quote_role', 'who_should_connect', 'what_to_discover', 'since',
  'signature_1', 'signature_2', 'signature_3',
  'us_event_1_name', 'us_event_1_url', 'us_event_2_name', 'us_event_2_url',
  'us_event_3_name', 'us_event_3_url', 'us_event_4_name', 'us_event_4_url',
  'what_they_bring', 'company_legal_name', 'address_street', 'address_city', 'country', 'email_1', 'email_2',
  'website', 'social_facebook', 'social_instagram', 'social_linkedin', 'social_youtube', 'social_whatsapp',
  'logo', 'photo', 'photo_alt', 'photo_credit',
  'gallery_1', 'gallery_2', 'gallery_3', 'gallery_4', 'gallery_5', 'gallery_6',
];

export interface ParsedCsv {
  rows: { row: Row; line: number }[];
  missingColumns: string[];
  unknownColumns: string[];
}

export function parseCompaniesCsv(text: string): ParsedCsv {
  const records: string[][] = parse(text, { bom: true, relax_column_count: true, skip_empty_lines: false });
  const header = (records[0] ?? []).map((h) => h.trim());
  const rows: ParsedCsv['rows'] = [];
  records.slice(1).forEach((cells, i) => {
    const row: Row = {};
    header.forEach((h, j) => {
      if (h && !h.startsWith('_')) row[h] = cells[j] ?? '';
    });
    // Empty rows of the sheet (no id and no name) are skipped silently.
    if (!(row.id ?? '').trim() && !(row.name ?? '').trim()) return;
    rows.push({ row, line: i + 2 });
  });
  return {
    rows,
    missingColumns: EXPECTED_COLUMNS.filter((c) => !header.includes(c)),
    unknownColumns: header.filter((h) => h && !h.startsWith('_') && !EXPECTED_COLUMNS.includes(h)),
  };
}
