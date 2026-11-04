/**
 * Minimal templating with automatic escaping: every value from the sheet goes through esc().
 * Use raw() only for HTML built by the app itself.
 */
const RAW = Symbol('raw');
export interface Raw {
  [RAW]: true;
  value: string;
}
export const raw = (value: string): Raw => ({ [RAW]: true, value });

export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type Value = string | number | null | undefined | false | Raw | Value[];

function render(v: Value): string {
  if (v === null || v === undefined || v === false) return '';
  if (Array.isArray(v)) return v.map(render).join('');
  if (typeof v === 'object' && RAW in v) return v.value;
  return esc(v);
}

/** html`<p>${text}</p>` → Raw (values escaped). */
export function html(strings: TemplateStringsArray, ...values: Value[]): Raw {
  let out = strings[0];
  values.forEach((v, i) => (out += render(v) + strings[i + 1]));
  return raw(out);
}

/** Only https links (or mailto:) end up in an href. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^(https:\/\/|mailto:)/i.test(url) ? url : null;
}
