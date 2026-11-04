/**
 * Values of the "Companies" tab → CSV for import-data. Internal columns (name starting with "_":
 * client contact, account owner, notes) are dropped here, so they never reach the repository or the site.
 */
export function valuesToCsv(values: unknown[][]): string {
  const header = (values[0] ?? []).map((h) => String(h ?? '').trim());
  const keep = header.map((h, i) => (h && !h.startsWith('_') ? i : -1)).filter((i) => i >= 0);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return values
    .filter((row, i) => i === 0 || (Array.isArray(row) && row.some((v) => String(v ?? '').trim() !== '')))
    .map((row) => keep.map((i) => cell((row as unknown[])[i])).join(','))
    .join('\n') + '\n';
}

/** File names to download from Drive: logo, photo, gallery of every row, plus the edition covers. */
export function referencedFiles(rows: Record<string, string>[], covers: string[]): string[] {
  const names = new Set<string>(covers.filter(Boolean));
  for (const r of rows) {
    for (const k of ['logo', 'photo', 'gallery_1', 'gallery_2', 'gallery_3', 'gallery_4', 'gallery_5', 'gallery_6']) {
      const v = (r[k] ?? '').trim();
      if (v) names.add(v);
    }
  }
  return [...names].sort();
}
