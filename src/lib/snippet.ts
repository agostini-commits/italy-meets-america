/** Text helpers for the index results (pure: tested in tests/search.test.ts). */
import { normalize } from '../search';
import { esc } from './html';

/** Highlights the searched words (only when normalising does not change the length of the text). */
export function highlight(text: string, words: string[]): string {
  const norm = normalize(text);
  if (!words.length || norm.length !== text.length) return esc(text);
  const marks = new Array<boolean>(text.length).fill(false);
  for (const w of words) {
    let i = norm.indexOf(w);
    while (i >= 0) {
      for (let k = i; k < i + w.length; k++) marks[k] = true;
      i = norm.indexOf(w, i + w.length);
    }
  }
  let out = '';
  let open = false;
  for (let i = 0; i < text.length; i++) {
    if (marks[i] !== open) {
      out += marks[i] ? '<mark>' : '</mark>';
      open = marks[i];
    }
    out += esc(text[i]);
  }
  return open ? out + '</mark>' : out;
}

/** Long texts: only the passage around the first word found ("… luxury hospitality, and …"). */
export function snippet(text: string, words: string[], max = 110): string {
  if (text.length <= max) return text;
  const norm = normalize(text);
  const hits = words.map((w) => norm.indexOf(w)).filter((i) => i >= 0);
  const at = norm.length === text.length && hits.length ? Math.min(...hits) : 0;
  let start = Math.max(0, at - 40);
  let end = Math.min(text.length, start + max);
  start = Math.max(0, end - max);
  if (start > 0) start = text.indexOf(' ', start) + 1 || start;
  if (end < text.length) end = text.lastIndexOf(' ', end) > start ? text.lastIndexOf(' ', end) : end;
  return `${start > 0 ? '… ' : ''}${text.slice(start, end).replace(/[,;:]$/, '')}${end < text.length ? ' …' : ''}`;
}

