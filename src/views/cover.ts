import { coverPartners, sections as yearbookSections, type EditionData } from '../data';
import { html } from '../lib/html';
import { picture } from '../lib/picture';
import { url } from '../router';

export function coverView({ edition, companies, images }: EditionData) {
  const sections = yearbookSections(companies);
  const partners = coverPartners(companies);
  return html`
    <section class="cover" aria-labelledby="cover-title">
      ${picture(images[edition.cover_photo], { alt: edition.cover_photo_alt, sizes: '100vw', eager: true, className: 'cover-img' })}
      <div class="cover-text">
        <p class="label">${edition.kicker}</p>
        <h1 id="cover-title" class="cover-title">${edition.title.replace(/ America$/, '')} <em>America</em></h1>
        <p class="cover-tagline">${edition.tagline}</p>
        ${partners.length
          ? html`<p class="cover-partners"><span class="label">With</span> ${partners.map((c, i) => html`${i ? (i === partners.length - 1 ? ' and ' : ', ') : ''}<a href="${url.company(edition.edition, c.id)}">${c.name}</a>`)}</p>`
          : ''}
        <p class="cover-actions">
          <a class="btn" href="${companies[0] ? url.company(edition.edition, companies[0].id) : url.companies(edition.edition)}">Start reading</a>
          <button type="button" class="btn btn-ghost" data-install hidden>Install the app</button>
        </p>
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
