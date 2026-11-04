import type { EditionData } from '../data';
import { html, safeUrl } from '../lib/html';
import { picture } from '../lib/picture';
import { url } from '../router';
import type { Company } from '../types';

const SOCIAL_LABEL = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', whatsapp: 'WhatsApp' } as const;

/** One card, blocks in the approved order. Layout (mobile / desktop spread) comes in the next step. */
export function companyCard(c: Company, data: EditionData, eager: boolean) {
  const img = data.images;
  return html`
    <article class="card" aria-labelledby="name-${c.id}" data-company="${c.id}">
      <div class="card-photo">
        ${picture(img[c.photo.file], { alt: c.photo.alt, sizes: '(min-width: 900px) 45vw, 100vw', eager, className: 'card-photo-img' })}
        <div class="card-photo-text">
          <p class="label">${c.sector}</p>
          <p class="card-headline">${c.headline}</p>
          <p class="card-footer">Italy meets America | Yearbook ${c.edition}</p>
        </div>
      </div>
      <div class="card-body">
        <header class="card-head">
          ${img[c.logo] ? picture(img[c.logo], { alt: `${c.name} logo`, sizes: '120px', className: 'card-logo' }) : ''}
          <div>
            <h1 id="name-${c.id}" class="card-name">${c.name}</h1>
            <p class="card-place">${c.city} | ${c.region}</p>
          </div>
        </header>
        <p class="card-intro">${c.intro_parts.map((p) => (p.bold ? html`<strong>${p.text}</strong>` : html`${p.text}`))}</p>
        <dl class="card-mv">
          <div><dt class="label">Mission</dt><dd>${c.mission}</dd></div>
          <div><dt class="label">Vision</dt><dd>${c.vision}</dd></div>
        </dl>
        <div class="card-quote-row">
          <figure class="card-quote">
            <blockquote>${c.quote}</blockquote>
            <figcaption>— ${c.quote_author}${c.quote_role ? `, ${c.quote_role}` : ''}</figcaption>
          </figure>
          <dl class="card-connect">
            <dt class="tag">Who should connect</dt><dd>${c.who_should_connect}</dd>
            <dt class="tag">What to discover</dt><dd>${c.what_to_discover}</dd>
          </dl>
        </div>
        <div class="card-since-row">
          <div class="card-since"><span class="label">Since</span><span class="card-year">${c.since}</span></div>
          <div class="card-signature"><span class="label">Signature</span><ul>${c.signature.map((s) => html`<li>${s}</li>`)}</ul></div>
        </div>
        ${c.us_events.length
          ? html`<section class="card-block"><h2 class="label rule">Find us in the US</h2><ul class="card-events">
              ${c.us_events.map((e) => {
                const href = safeUrl(e.url);
                return html`<li>${href ? html`<a href="${href}" target="_blank" rel="noopener" data-track="click_us_event" data-company="${c.id}" data-label="${e.name}">${e.name}</a>` : e.name}</li>`;
              })}</ul></section>`
          : ''}
        <section class="card-block"><h2 class="label rule">What they bring to America</h2><p>${c.what_they_bring}</p></section>
        <section class="card-block card-contacts">
          <h2 class="label rule">Contacts</h2>
          <address>${c.company_legal_name}<br />${c.address.street}<br />${c.address.city}, ${c.address.country}</address>
          <p>
            ${c.emails.map((e) => html`<a href="mailto:${e}" data-track="click_email" data-company="${c.id}">${e}</a><br />`)}
            <a href="${safeUrl(c.website) ?? '#'}" target="_blank" rel="noopener" data-track="click_website" data-company="${c.id}">${c.website_label}</a>
          </p>
          <ul class="card-social">
            ${Object.entries(c.social).map(([k, v]) => {
              const href = safeUrl(v);
              return href ? html`<li><a href="${href}" target="_blank" rel="noopener" data-track="click_social" data-company="${c.id}" data-label="${k}">${SOCIAL_LABEL[k as keyof typeof SOCIAL_LABEL]}</a></li>` : '';
            })}
          </ul>
        </section>
        ${c.gallery.length
          ? html`<section class="card-block"><h2 class="label rule">Gallery</h2><div class="card-gallery">${c.gallery.map((g) => picture(img[g.file], { alt: g.alt, sizes: '(min-width: 900px) 20vw, 50vw' }))}</div></section>`
          : ''}
      </div>
    </article>`;
}

/** Flipbook: one card at a time, previous / next, position. Swipe and keyboard are wired in main.ts. */
export function companyView(data: EditionData, id: string) {
  const list = data.companies;
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return null;
  const ed = data.edition.edition;
  const prev = list[i - 1];
  const next = list[i + 1];
  return html`
    ${companyCard(list[i], data, true)}
    <nav class="flip no-print" aria-label="Pages">
      ${prev ? html`<a class="flip-btn" rel="prev" href="${url.company(ed, prev.id)}" data-flip="prev" aria-label="Previous: ${prev.name}">←</a>` : html`<a class="flip-btn" href="${url.cover(ed)}" aria-label="Back to contents">←</a>`}
      <span class="flip-pos" aria-live="polite">${i + 1} / ${list.length}</span>
      ${next ? html`<a class="flip-btn" rel="next" href="${url.company(ed, next.id)}" data-flip="next" aria-label="Next: ${next.name}">→</a>` : html`<span class="flip-btn" aria-hidden="true"></span>`}
    </nav>`;
}
