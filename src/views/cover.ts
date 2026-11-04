import { bySector, type EditionData } from '../data';
import { html } from '../lib/html';
import { picture } from '../lib/picture';
import { url } from '../router';

export function coverView({ edition, companies, images }: EditionData) {
  const sections = bySector(companies);
  return html`
    <section class="cover" aria-labelledby="cover-title">
      ${picture(images[edition.cover_photo], { alt: edition.cover_photo_alt, sizes: '100vw', eager: true, className: 'cover-img' })}
      <div class="cover-text">
        <p class="label">${edition.kicker}</p>
        <h1 id="cover-title" class="cover-title">${edition.title.replace(/ America$/, '')} <em>America</em></h1>
        <p class="cover-tagline">${edition.tagline}</p>
        <a class="btn" href="${companies[0] ? url.company(edition.edition, companies[0].id) : url.companies(edition.edition)}">Start reading</a>
      </div>
    </section>
    <section class="contents" aria-labelledby="contents-title">
      <h2 id="contents-title">Contents</h2>
      <ul class="contents-pages">
        <li><a href="${url.page(edition.edition, 'editorial')}">Editorial</a></li>
        <li><a href="${url.page(edition.edition, 'colophon')}">Colophon</a></li>
      </ul>
      ${sections.map(
        ([sector, list]) => html`
          <h3 class="label">${sector} <span class="count">${list.length}</span></h3>
          <ol class="contents-list">
            ${list.map(
              (c) => html`<li><a href="${url.company(edition.edition, c.id)}"><span class="toc-name">${c.name}</span><span class="toc-city">${c.city} · ${c.region}</span></a></li>`,
            )}
          </ol>`,
      )}
    </section>`;
}
