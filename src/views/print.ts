import { track } from '../analytics';
import { bySector, type EditionData } from '../data';
import { esc, html, raw, safeUrl, type Raw } from '../lib/html';
import { SOCIAL_ICONS } from '../lib/icons';
import { FORMATS, pagesPerCard, planPrint, type Format, type Sheet } from '../print-plan';
import type { Company, ImageInfo, Social } from '../types';

/**
 * Print: format (Magazine / Single sheet), cover, "for the printer" (3 mm bleed + crop marks),
 * page selection (all / none / by sector / by company), preview of the real sheets and
 * "Print / Save as PDF". Sheets are built at real size (mm, pt): the preview is what gets printed.
 * Each sheet whose text does not fit shows a warning (never printed).
 */
export function printView({ edition, companies }: EditionData) {
  const sections = bySector(companies);
  return html`
    <section class="print-page">
      <aside class="print-panel no-print" aria-labelledby="print-title">
        <h1 id="print-title">Print</h1>
        <p class="print-lead">Print the yearbook or the companies you choose, or save them as a PDF.</p>
        <fieldset class="print-group">
          <legend class="label">Format</legend>
          ${(Object.keys(FORMATS) as Format[]).map(
            (f, i) => html`<label class="print-option"><input type="radio" name="format" value="${f}" ${i === 0 ? raw('checked') : ''} />
              <span><b>${FORMATS[f].label}</b><small>${FORMATS[f].note}</small></span></label>`,
          )}
        </fieldset>
        <fieldset class="print-group">
          <legend class="label">Options</legend>
          <label class="print-option"><input type="checkbox" name="cover" checked /><span><b>Cover</b><small>Edition ${edition.edition} cover as the first page.</small></span></label>
          <label class="print-option"><input type="checkbox" name="bleed" /><span><b>For the printer</b><small>Adds 3 mm bleed and crop marks around every page.</small></span></label>
        </fieldset>
        <fieldset class="print-group print-select">
          <legend class="label">Pages</legend>
          <div class="print-quick"><button type="button" data-select="all">All</button><button type="button" data-select="none">None</button></div>
          ${sections.map(
            ([sector, list]) => html`<div class="print-sector">
              <label class="print-check print-check--sector"><input type="checkbox" data-sector="${sector}" checked /> <span>${sector}</span> <small>${list.length}</small></label>
              <ul>${list.map((c) => html`<li><label class="print-check"><input type="checkbox" data-company="${c.id}" data-of="${sector}" checked /> <span>${c.name}</span> <small data-pages="${c.id}"></small></label></li>`)}</ul>
            </div>`,
          )}
        </fieldset>
        <div class="print-action">
          <p class="print-summary" aria-live="polite" data-summary></p>
          <ul class="print-warnings" data-warnings hidden></ul>
          <button type="button" class="btn print-btn" data-print>Print / Save as PDF</button>
          <p class="print-hint">In the print window choose “Save as PDF” to get a file. Leave margins on “Default” or “None”.</p>
        </div>
      </aside>
      <div class="print-preview" aria-label="Preview of the pages" data-preview></div>
    </section>`;
}

// --- sheets ---------------------------------------------------------------------------------------

function img(info: ImageInfo | undefined, alt: string, cls: string): Raw {
  if (!info) return html`<div class="${cls} img-missing" role="img" aria-label="${alt}"></div>`;
  if (info.svg) return html`<img class="${cls}" src="${info.svg}" alt="${alt}" />`;
  const web = Object.entries(info.web).sort((a, b) => Number(a[0]) - Number(b[0]));
  const preview = (web.find(([w]) => Number(w) >= 1000) ?? web[web.length - 1])?.[1] ?? '';
  return html`<img class="${cls}" src="${preview}" alt="${alt}" loading="lazy" decoding="async" data-print="${info.print ?? ''}" style="${raw(/^#[0-9a-f]{6}$/i.test(info.color) ? `background:${info.color}` : '')}" />`;
}

const footer = (ed: number, page: number, light = false) =>
  html`<footer class="ps-folio${light ? ' ps-folio--light' : ''}"><span>Italy meets America | Yearbook ${ed}</span><span>${page}</span></footer>`;

function textBlocks(c: Company, images: Record<string, ImageInfo>): Raw {
  return html`
    <header class="ps-head">
      ${images[c.logo] ? html`<div class="ps-logo">${img(images[c.logo], `${c.name} logo`, '')}</div>` : ''}
      <div><h2 class="ps-name">${c.name}</h2><p class="ps-place">${c.city} | ${c.region}</p></div>
    </header>
    <p class="ps-intro">${c.intro_parts.map((p) => (p.bold ? html`<strong>${p.text}</strong>` : html`${p.text}`))}</p>
    <div class="ps-mv"><div><p class="ps-label">Mission</p><p>${c.mission}</p></div><div><p class="ps-label">Vision</p><p>${c.vision}</p></div></div>
    <div class="ps-voice">
      <div><p class="ps-quote">${c.quote}</p><p class="ps-author">— ${c.quote_author}${c.quote_role ? `, ${c.quote_role}` : ''}</p></div>
      <div><p class="ps-tag">Who should connect</p><p>${c.who_should_connect}</p><p class="ps-tag">What to discover</p><p>${c.what_to_discover}</p></div>
    </div>
    <div class="ps-facts">
      <div class="ps-since"><p class="ps-flabel">Since</p><p class="ps-year">${c.since}</p></div>
      <div class="ps-sig"><p class="ps-flabel">Signature</p><ul style="--n:${c.signature.length}">${c.signature.map((s) => html`<li>${s}</li>`)}</ul></div>
    </div>
    ${c.us_events.length ? html`<p class="ps-label ps-rule">Find us in the US</p><p class="ps-events">${c.us_events.map((e, i) => html`${i ? raw('<span class="ps-sep">|</span>') : ''}<span>${e.name}</span>`)}</p>` : ''}
    <p class="ps-label ps-rule">What they bring to America</p>
    <p>${c.what_they_bring}</p>
    <div class="ps-contacts-block">
    <p class="ps-label ps-rule">Contacts</p>
    <div class="ps-contacts">
      <p>${c.company_legal_name}<br />${c.address.street}<br />${c.address.city}${/italy/i.test(c.address.city) ? '' : `, ${c.address.country}`}</p>
      <p>${c.emails.map((e) => html`${e}<br />`)}<a href="${safeUrl(c.website) ?? '#'}">${c.website_label}</a></p>
      <div class="ps-social">${(Object.keys(c.social) as Social[]).map((k) => html`<svg viewBox="0 0 24 24" aria-label="${k}">${raw(SOCIAL_ICONS[k])}</svg>`)}</div>
    </div>
    </div>`;
}

function sheetInner(s: Sheet, data: EditionData): { bleed: Raw; trim: Raw } {
  const ed = data.edition.edition;
  const c = s.company;
  const im = data.images;
  if (s.kind === 'cover') {
    const e = data.edition;
    return {
      bleed: html`${img(im[e.cover_photo], e.cover_photo_alt, 'ps-fill')}<div class="ps-cover-shade"></div>`,
      trim: html`<div class="ps-cover">
        <p class="ps-cover-top"><span>Forbes Italia</span><span>The Yearbook<br />Edition ${ed}</span></p>
        <div><p class="ps-cover-kicker">Made in Italy for USA</p><h1 class="ps-cover-title">${e.title.replace(/ America$/, '')}<em>America</em></h1><p class="ps-cover-tag">${e.tagline}</p></div>
      </div>`,
    };
  }
  if (!c) return { bleed: html``, trim: html`` };
  if (s.kind === 'photo')
    return {
      bleed: html`${img(im[c.photo.file], c.photo.alt, 'ps-fill')}<div class="ps-shade"></div>`,
      trim: html`<div class="ps-photo-text"><p class="ps-sector">${c.sector}</p><p class="ps-headline">${c.headline}</p></div>${footer(ed, s.page, true)}`,
    };
  if (s.kind === 'text')
    return { bleed: html`<div class="ps-paper"></div>`, trim: html`<div class="ps-text" data-fit>${textBlocks(c, im)}</div>${footer(ed, s.page)}` };
  if (s.kind === 'single')
    return {
      bleed: html`<div class="ps-paper"></div><div class="ps-single-photo">${img(im[c.photo.file], c.photo.alt, 'ps-fill')}<div class="ps-shade"></div></div>`,
      trim: html`<div class="ps-single-photo-text"><p class="ps-sector">${c.sector}</p><p class="ps-headline">${c.headline}</p></div>
        <div class="ps-text ps-text--single" data-fit>${textBlocks(c, im)}</div>${footer(ed, s.page)}`,
    };
  // gallery
  const photos = (s.gallery ?? []).map((i) => c.gallery[i]).filter(Boolean);
  return {
    bleed: html`<div class="ps-paper"></div>`,
    trim: html`<div class="ps-gallery-page"><p class="ps-label">${c.name} · Gallery</p>
      <div class="ps-gallery ps-gallery--${photos.length}">${photos.map((g) => img(im[g.file], g.alt, 'ps-fill'))}</div></div>${footer(ed, s.page)}`,
  };
}

const MARKS = ['tl-h', 'tl-v', 'tr-h', 'tr-v', 'bl-h', 'bl-v', 'br-h', 'br-v'];

function sheetHtml(s: Sheet, data: EditionData, bleed: boolean): string {
  const { bleed: b, trim } = sheetInner(s, data);
  const name = s.company ? s.company.name : 'Cover';
  return html`<section class="sheet sheet--${s.orientation} sheet--${s.kind}" data-page="${s.page}" data-name="${name}" aria-label="Page ${s.page}: ${name}">
    <div class="sheet-bleed">${b}</div>
    <div class="sheet-trim">${trim}</div>
    ${bleed ? raw(MARKS.map((m) => `<i class="mark mark--${m}"></i>`).join('')) : ''}
    <p class="sheet-warn no-print" hidden>Text does not fit this page</p>
  </section>`.value;
}

// --- page behaviour --------------------------------------------------------------------------------

const PAGE_STYLE_ID = 'ima-print-pages';

/** @page sizes depend on the options: written as a <style> (CSS variables do not work inside @page). */
function pageCss(bleed: boolean): string {
  const extra = bleed ? 2 * (3 + 7) : 0; // 3 mm bleed + 7 mm for the crop marks, on each side
  return `@page portrait { size: ${210 + extra}mm ${297 + extra}mm; margin: 0; }
@page landscape { size: ${297 + extra}mm ${210 + extra}mm; margin: 0; }
@page { margin: 0; }`;
}

export function mountPrint(data: EditionData): void {
  const root = document.querySelector<HTMLElement>('.print-page');
  if (!root) return;
  const preview = root.querySelector<HTMLElement>('[data-preview]')!;
  const summary = root.querySelector<HTMLElement>('[data-summary]')!;
  const warnings = root.querySelector<HTMLElement>('[data-warnings]')!;
  const printBtn = root.querySelector<HTMLButtonElement>('[data-print]')!;
  const boxes = [...root.querySelectorAll<HTMLInputElement>('[data-company]')];
  const sectorBoxes = [...root.querySelectorAll<HTMLInputElement>('[data-sector]')];

  const params = new URLSearchParams(location.search);
  const formatInput = root.querySelector<HTMLInputElement>(`input[name="format"][value="${params.get('format') === 'single' ? 'single' : 'magazine'}"]`);
  if (formatInput) formatInput.checked = true;
  const bleedBox = root.querySelector<HTMLInputElement>('input[name="bleed"]')!;
  const coverBox = root.querySelector<HTMLInputElement>('input[name="cover"]')!;
  bleedBox.checked = params.get('bleed') === '1';
  if (params.get('cover') === '0') coverBox.checked = false;

  let style = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = PAGE_STYLE_ID;
    document.head.append(style);
  }

  const opts = () => ({
    format: (root.querySelector<HTMLInputElement>('input[name="format"]:checked')?.value ?? 'magazine') as Format,
    bleed: bleedBox.checked,
    cover: coverBox.checked,
    selected: new Set(boxes.filter((b) => b.checked).map((b) => b.dataset.company!)),
  });

  const fitZoom = () => {
    const o = opts();
    // Magazine: two portrait pages side by side (a spread); single sheet: one landscape page per row.
    const extra = o.bleed ? 20 : 0;
    const mmWide = o.format === 'magazine' ? 2 * (210 + extra) + 6 : 297 + extra;
    const px = mmWide * 3.7795;
    const z = Math.min(1, Math.max(0.2, (preview.clientWidth - 8) / px));
    preview.style.setProperty('--z', z.toFixed(4));
  };

  let checkTimer = 0;
  const checkFit = () => {
    const over: { page: string; name: string }[] = [];
    for (const sheet of preview.querySelectorAll<HTMLElement>('.sheet')) {
      const box = sheet.querySelector<HTMLElement>('[data-fit]');
      const bad = !!box && box.scrollHeight > box.clientHeight + 1;
      sheet.classList.toggle('sheet--over', bad);
      sheet.querySelector<HTMLElement>('.sheet-warn')!.hidden = !bad;
      if (bad) over.push({ page: sheet.dataset.page!, name: sheet.dataset.name! });
    }
    warnings.hidden = over.length === 0;
    warnings.innerHTML = over.map((o) => `<li>Page ${esc(o.page)} · ${esc(o.name)}: the text does not fit</li>`).join('');
  };

  const draw = () => {
    const o = opts();
    style!.textContent = pageCss(o.bleed);
    preview.dataset.format = o.format;
    preview.classList.toggle('with-bleed', o.bleed);
    const sheets = planPrint(data.companies, o.selected, o.format, o.cover);
    preview.innerHTML = sheets.length
      ? sheets.map((s) => sheetHtml(s, data, o.bleed)).join('')
      : '<p class="print-empty">Choose at least one company or the cover.</p>';
    for (const c of data.companies) {
      const el = root.querySelector(`[data-pages="${CSS.escape(c.id)}"]`);
      if (el) el.textContent = `${pagesPerCard(c, o.format)} p.`;
    }
    for (const sb of sectorBoxes) {
      const own = boxes.filter((b) => b.dataset.of === sb.dataset.sector);
      const n = own.filter((b) => b.checked).length;
      sb.checked = n === own.length;
      sb.indeterminate = n > 0 && n < own.length;
    }
    const cards = o.selected.size;
    summary.textContent = `${cards} ${cards === 1 ? 'company' : 'companies'} · ${sheets.length} ${sheets.length === 1 ? 'page' : 'pages'} · ${FORMATS[o.format].label}${o.bleed ? ' with bleed' : ''}`;
    printBtn.disabled = sheets.length === 0;

    const p = new URLSearchParams();
    if (o.format !== 'magazine') p.set('format', o.format);
    if (o.bleed) p.set('bleed', '1');
    if (!o.cover) p.set('cover', '0');
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));

    fitZoom();
    clearTimeout(checkTimer);
    checkTimer = window.setTimeout(() => document.fonts.ready.then(checkFit), 50);
  };

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.sector) boxes.filter((b) => b.dataset.of === t.dataset.sector).forEach((b) => (b.checked = t.checked));
    draw();
  });
  root.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-select]');
    if (!b) return;
    boxes.forEach((x) => (x.checked = b.dataset.select === 'all'));
    draw();
  });

  /** High-resolution images only for printing: swapped in, then the print dialog opens when they are loaded. */
  const useHiRes = () =>
    [...preview.querySelectorAll<HTMLImageElement>('img[data-print]')].filter((i) => i.dataset.print).map((i) => {
      i.loading = 'eager';
      if (i.getAttribute('src') !== i.dataset.print) i.src = i.dataset.print!;
      return i;
    });

  const doPrint = async () => {
    const o = opts();
    printBtn.disabled = true;
    const imgs = useHiRes();
    let done = 0;
    const label = printBtn.textContent;
    const tick = () => (printBtn.textContent = `Preparing images ${done}/${imgs.length}…`);
    tick();
    await Promise.all(imgs.map((i) => i.decode().catch(() => {}).then(() => { done++; tick(); })));
    printBtn.textContent = label;
    printBtn.disabled = false;
    track('print', { format: o.format, companies: o.selected.size, pages: preview.querySelectorAll('.sheet').length, bleed: o.bleed, cover: o.cover });
    window.print();
  };
  printBtn.addEventListener('click', () => void doPrint());

  // Ctrl/Cmd+P on this page goes through the same preparation; printing from the browser menu swaps at once.
  const onKey = (e: KeyboardEvent) => {
    if (!document.querySelector('.print-page')) return document.removeEventListener('keydown', onKey);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      void doPrint();
    }
  };
  document.addEventListener('keydown', onKey);
  const onBeforePrint = () => {
    if (!document.querySelector('.print-page')) return window.removeEventListener('beforeprint', onBeforePrint);
    useHiRes();
  };
  window.addEventListener('beforeprint', onBeforePrint);
  const onResize = () => {
    if (!document.querySelector('.print-page')) return window.removeEventListener('resize', onResize);
    fitZoom();
  };
  window.addEventListener('resize', onResize);

  draw();
}
