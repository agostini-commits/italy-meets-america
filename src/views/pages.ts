import type { EditionData } from '../data';
import { html } from '../lib/html';

/** Editorial and colophon: placeholders until the texts arrive. */
export function pageView({ edition }: EditionData, page: 'editorial' | 'colophon') {
  return page === 'editorial'
    ? html`<article class="page"><p class="label">Editorial</p><h1>Italy meets America</h1><p>Editorial text of the ${edition.edition} edition (to be provided).</p></article>`
    : html`<article class="page"><p class="label">Colophon</p><h1>Credits</h1><p>Forbes Italia – BFC AI Media. Colophon of the ${edition.edition} edition (to be provided).</p></article>`;
}

export function messageView(title: string, text: string) {
  return html`<section class="page"><h1>${title}</h1><p>${text}</p><p><a href="/">Back to the yearbook</a></p></section>`;
}
