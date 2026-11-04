/** Row of the "_Publish" tab of the sheet, built from the import report (pure: tested). */
export interface ReportRow {
  line: number;
  name: string;
  status: string;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
  published: boolean;
}

export const PUBLISH_HEADER = ['When (Rome)', 'Requested by', 'Result', 'Published', 'Not published (errors)', 'Warnings', 'Details', 'Site'];

export function publishRow(p: {
  when: Date;
  requestedBy: string;
  ok: boolean;
  report: { rows: ReportRow[]; published: number } | null;
  runUrl: string;
  site: string;
}): (string | number)[] {
  const when = p.when.toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' });
  const rows = p.report?.rows ?? [];
  const blocked = rows.filter((r) => r.errors.length && ['approved', 'published'].includes(r.status));
  const warnings = rows.reduce((n, r) => n + r.warnings.length, 0);
  const firstErrors = blocked
    .slice(0, 3)
    .map((r) => `row ${r.line} ${r.name}: ${r.errors.map((e) => `${e.field} ${e.message}`).join('; ')}`)
    .join(' | ');
  const result = p.ok ? 'OK' : p.report ? 'FAILED' : 'FAILED (before the checks)';
  return [
    when,
    p.requestedBy,
    result,
    p.ok ? (p.report?.published ?? '') : 0,
    blocked.length ? `${blocked.length}: ${firstErrors}` : 0,
    warnings,
    p.runUrl,
    p.ok ? p.site : '',
  ];
}
