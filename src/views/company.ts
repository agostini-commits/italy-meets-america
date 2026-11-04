import type { EditionData } from '../data';
import { html, raw, safeUrl } from '../lib/html';
import { SOCIAL_ICONS, SOCIAL_LABEL } from '../lib/icons';
import { picture } from '../lib/picture';
import { url } from '../router';
import type { Company, Social } from '../types';

/**
 * One card. Order of the blocks (approved layout, PDF 2026):
 * logo + name + city | intro with drop cap | Mission / Vision | quote + Who should connect / What to discover |
 * Since + Signature | Find us in the US | What they bring to America | Contacts + social (| gallery, premium).
 * Mobile (< 600 px): photo 4:5 on top with sector, headline and footer over it, then the text.
 */
export function companyCard(c: Company, data: EditionData, eager: boolean) {
  const img = data.images;
  const ed = c.edition;
  return html`
    <article class="card" aria-labelledby="name-${c.id}" data-company="${c.id}" data-package="${c.package}">
      <div class="card-photo">
        ${picture(img[c.photo.file], { alt: c.photo.alt, sizes: '(min-width: 900px) 50vw, 100vw', eager, className: 'card-photo-img' })}
        <div class="card-photo-text">
          <p class="card-sector">${c.sector}</p>
          <p class="card-headline">${c.headline}</p>
          <p class="card-footer">Italy meets America | Yearbook ${ed}</p>
        </div>
        ${c.photo.credit ? html`<p class="card-credit">Photo: ${c.photo.credit}</p>` : ''}
      </div>

      <div class="card-body">
        <header class="card-head">
          ${img[c.logo] ? html`<div class="card-logo">${picture(img[c.logo], { alt: `${c.name} logo`, sizes: '96px' })}</div>` : ''}
          <div class="card-id">
            <h1 id="name-${c.id}" class="card-name">${c.name}</h1>
            <p class="card-place">${c.city} <span aria-hidden="true">|</span><span class="sr-only">,</span> ${c.region}</p>
          </div>
        </header>

        <p class="card-intro">${c.intro_parts.map((p) => (p.bold ? html`<strong>${p.text}</strong>` : html`${p.text}`))}</p>

        <dl class="card-mv">
          <div><dt class="card-label">Mission</dt><dd>${c.mission}</dd></div>
          <div><dt class="card-label">Vision</dt><dd>${c.vision}</dd></div>
        </dl>

        <div class="card-voice">
          <figure class="card-quote">
            <blockquote><p>${c.quote}</p></blockquote>
            <figcaption>— ${c.quote_author}${c.quote_role ? `, ${c.quote_role}` : ''}</figcaption>
          </figure>
          <dl class="card-connect">
            <div><dt class="card-tag">Who should connect</dt><dd>${c.who_should_connect}</dd></div>
            <div><dt class="card-tag">What to discover</dt><dd>${c.what_to_discover}</dd></div>
          </dl>
        </div>

        <div class="card-facts">
          <div class="card-since"><span class="card-facts-label">Since</span><span class="card-year">${c.since}</span></div>
          <div class="card-signature">
            <span class="card-facts-label">Signature</span>
            <ul style="--n:${c.signature.length}">${c.signature.map((s) => html`<li>${s}</li>`)}</ul>
          </div>
        </div>

        ${c.us_events.length
          ? html`<section class="card-section" aria-labelledby="us-${c.id}">
              <h2 id="us-${c.id}" class="card-label card-rule">Find us in the US</h2>
              <ul class="card-events">
                ${c.us_events.map((e) => {
                  const href = safeUrl(e.url);
                  return html`<li>${href
                    ? html`<a href="${href}" target="_blank" rel="noopener" data-track="click_us_event" data-company="${c.id}" data-label="${e.name}">${e.name}<span class="sr-only"> (opens in a new tab)</span></a>`
                    : html`<span>${e.name}</span>`}</li>`;
                })}
              </ul>
            </section>`
          : ''}

        <section class="card-section" aria-labelledby="bring-${c.id}">
          <h2 id="bring-${c.id}" class="card-label card-rule">What they bring to America</h2>
          <p>${c.what_they_bring}</p>
        </section>

        <section class="card-section card-contacts" aria-labelledby="contacts-${c.id}">
          <h2 id="contacts-${c.id}" class="card-label card-rule">Contacts</h2>
          <div class="card-contacts-grid">
            <address>${c.company_legal_name}<br />${c.address.street}<br />${c.address.city}${c.address.country && !/italy/i.test(c.address.city) ? html`, ${c.address.country}` : ''}</address>
            <ul class="card-links">
              ${c.emails.map((e) => html`<li><a href="mailto:${e}" data-track="click_email" data-company="${c.id}">${e}</a></li>`)}
              <li><a class="card-web" href="${safeUrl(c.website) ?? '#'}" target="_blank" rel="noopener" data-track="click_website" data-company="${c.id}">${c.website_label}<span class="sr-only"> (opens in a new tab)</span></a></li>
            </ul>
          </div>
          ${Object.keys(c.social).length
            ? html`<ul class="card-social">
                ${(Object.entries(c.social) as [Social, string][]).map(([k, v]) => {
                  const href = safeUrl(v);
                  return href
                    ? html`<li><a href="${href}" target="_blank" rel="noopener" aria-label="${c.name} on ${SOCIAL_LABEL[k]}" data-track="click_social" data-company="${c.id}" data-label="${k}">
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">${raw(SOCIAL_ICONS[k])}</svg></a></li>`
                    : '';
                })}
              </ul>`
            : ''}
        </section>

        ${c.gallery.length
          ? html`<section class="card-section" aria-labelledby="gallery-${c.id}">
              <h2 id="gallery-${c.id}" class="card-label card-rule">Gallery</h2>
              <div class="card-gallery">${c.gallery.map((g) => picture(img[g.file], { alt: g.alt, sizes: '(min-width: 900px) 20vw, 50vw' }))}</div>
            </section>`
          : ''}
      </div>
    </article>`;
}

const ARROW = {
  prev: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/**
 * Flipbook: one card at a time. Buttons (bar at the bottom on mobile, arrows beside the spread on
 * desktop), position "3 of 250" with a progress line, keyboard arrows and swipe (src/flip.ts).
 * At the ends the arrows lead back to the contents.
 */
export function companyView(data: EditionData, id: string) {
  const list = data.companies;
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return null;
  const ed = data.edition.edition;
  const c = list[i];
  const prev = list[i - 1];
  const next = list[i + 1];
  const pct = ((i + 1) / list.length) * 100;
  const btn = (dir: 'prev' | 'next', target: Company | undefined) =>
    target
      ? html`<a class="flip-btn flip-${dir}" rel="${dir}" href="${url.company(ed, target.id)}" data-flip="${dir}" aria-label="${dir === 'prev' ? 'Previous' : 'Next'}: ${target.name}">${raw(ARROW[dir])}<span class="flip-btn-name" aria-hidden="true">${target.name}</span></a>`
      : html`<a class="flip-btn flip-${dir} flip-end" href="${url.cover(ed)}" aria-label="Back to contents">${raw(ARROW[dir])}<span class="flip-btn-name" aria-hidden="true">Contents</span></a>`;
  return html`
    <div class="flipbook" data-index="${i}">
      ${companyCard(c, data, true)}
      <nav class="flip no-print" aria-label="Flip through the companies">
        ${btn('prev', prev)}
        <div class="flip-pos">
          <span class="flip-count" aria-live="polite"><span class="flip-sector">${c.sector} · </span>${i + 1} of ${list.length}</span>
          <span class="flip-bar" aria-hidden="true"><span style="width:${pct.toFixed(2)}%"></span></span>
        </div>
        ${btn('next', next)}
      </nav>
    </div>`;
}
