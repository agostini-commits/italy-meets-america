import type { ImageInfo } from '../types';
import { html, raw, type Raw } from './html';

interface Options {
  alt: string;
  /** CSS sizes attribute, e.g. "(min-width: 900px) 50vw, 100vw". */
  sizes: string;
  /** true for the first visible image (LCP): no lazy loading, high priority. */
  eager?: boolean;
  className?: string;
}

/**
 * Responsive <img> from the image manifest. The print version is used only in print
 * (data-print, swapped in by the print view), so the web never downloads the heavy JPGs.
 */
export function picture(info: ImageInfo | undefined, o: Options): Raw {
  if (!info) return html`<div class="${o.className ?? ''} img-missing" role="img" aria-label="${o.alt}"></div>`;
  if (info.svg) return html`<img class="${o.className ?? ''}" src="${info.svg}" alt="${o.alt}" decoding="async" />`;
  const entries = Object.entries(info.web).sort((a, b) => Number(a[0]) - Number(b[0]));
  const srcset = entries.map(([w, url]) => `${url} ${w}w`).join(', ');
  const fallback = entries[Math.min(1, entries.length - 1)]?.[1] ?? '';
  return html`<img class="${o.className ?? ''}" src="${fallback}" srcset="${srcset}" sizes="${o.sizes}"
    width="${info.width}" height="${info.height}" alt="${o.alt}" style="${raw(`background-color:${/^#[0-9a-f]{6}$/i.test(info.color) ? info.color : 'transparent'}`)}"
    ${raw(o.eager ? 'fetchpriority="high"' : 'loading="lazy"')} decoding="async" data-print="${info.print ?? ''}" />`;
}
