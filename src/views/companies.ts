import type { EditionData } from '../data';
import { html } from '../lib/html';
import { picture } from '../lib/picture';
import { url } from '../router';

/** Index: grid of cards. Search and filters (name, city, buyer, fairs; sector, region) come in the "index" step. */
export function companiesView({ edition, companies, images }: EditionData) {
  return html`
    <section class="index">
      <h1>Companies <span class="count">${companies.length}</span></h1>
      <ul class="index-grid">
        ${companies.map(
          (c) => html`<li><a class="index-item" href="${url.company(edition.edition, c.id)}">
            ${picture(images[c.photo.file], { alt: '', sizes: '(min-width: 900px) 25vw, 50vw', className: 'index-img' })}
            <span class="label">${c.sector}</span><span class="index-name">${c.name}</span><span class="index-city">${c.city} · ${c.region}</span>
          </a></li>`,
        )}
      </ul>
    </section>`;
}
