import { track } from '../analytics';
import type { EditionData } from '../data';
import { esc, html, raw } from '../lib/html';
import { picture } from '../lib/picture';
import { url } from '../router';
import { highlight, snippet } from '../lib/snippet';
import { buildIndex, facets, search, tokens, type Query, type Result } from '../search';

/**
 * Index: grid of all the cards with free search (name, city, buyers, US fairs, products) and filters
 * by sector and region. The state is in the address (?q=&sector=&region=), so a search can be shared.
 * The page is drawn once; typing only redraws the results (the focus stays in the box).
 */
export function companiesView({ companies }: EditionData) {
  return html`
    <section class="index" aria-labelledby="index-title">
      <header class="index-head">
        <h1 id="index-title">Companies <span class="count">${companies.length}</span></h1>
        <p class="index-lead">Find Italian companies by name, city, the buyers they want to meet or the US fairs where they exhibit.</p>
      </header>
      <form class="index-form" role="search" data-index-form>
        <label class="index-search">
          <span class="sr-only">Search companies</span>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input type="search" name="q" placeholder="Name, city, buyer or US fair" autocomplete="off" enterkeyhint="search" spellcheck="false" />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <div class="index-filters">
          <div class="index-sectors" role="group" aria-label="Sector" data-sectors></div>
          <label class="index-region">
            <span>Region</span>
            <select name="region" data-region></select>
          </label>
        </div>
      </form>
      <div class="index-status">
        <p aria-live="polite" data-status></p>
        <button type="button" class="index-clear" data-clear hidden>Clear filters</button>
      </div>
      <ul class="index-grid" data-results></ul>
      <div class="index-empty" data-empty hidden>
        <p>No companies match your search.</p>
        <button type="button" class="btn" data-clear>Clear filters</button>
      </div>
    </section>`;
}

function item(r: Result, data: EditionData, words: string[], eager: boolean) {
  const c = r.company;
  return html`<li><a class="index-item" href="${url.company(c.edition, c.id)}">
    ${picture(data.images[c.photo.file], { alt: '', sizes: '(min-width: 900px) 260px, 50vw', className: 'index-img', eager })}
    <span class="label">${c.sector}</span>
    <span class="index-name">${raw(highlight(c.name, words))}</span>
    <span class="index-city">${raw(highlight(`${c.city} · ${c.region}`, words))}</span>
    ${r.matches.length
      ? html`<span class="index-why">${r.matches.slice(0, 2).map((m) => html`<span><b>${m.label}</b> ${raw(highlight(snippet(m.text, words), words))}</span>`)}</span>`
      : ''}
  </a></li>`;
}

export function mountIndex(data: EditionData): void {
  const root = document.querySelector<HTMLElement>('.index');
  const form = root?.querySelector<HTMLFormElement>('[data-index-form]');
  if (!root || !form) return;
  const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const regionSel = form.querySelector<HTMLSelectElement>('[data-region]')!;
  const sectorsBox = form.querySelector<HTMLElement>('[data-sectors]')!;
  const list = root.querySelector<HTMLElement>('[data-results]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const empty = root.querySelector<HTMLElement>('[data-empty]')!;
  const clearTop = root.querySelector<HTMLElement>('.index-clear')!;

  const index = buildIndex(data.companies);
  const sectors = [...new Set(data.companies.map((c) => c.sector))];
  const regions = [...new Set(data.companies.map((c) => c.region))].sort((a, b) => a.localeCompare(b, 'en'));

  const params = new URLSearchParams(location.search);
  const state: Query = {
    q: params.get('q') ?? '',
    sector: sectors.includes(params.get('sector') ?? '') ? params.get('sector')! : '',
    region: regions.includes(params.get('region') ?? '') ? params.get('region')! : '',
  };
  input.value = state.q;

  let trackTimer = 0;
  let firstDraw = true;

  const draw = () => {
    const results = search(index, state);
    const f = facets(index, state);
    const words = tokens(state.q);

    const chip = (value: string, label: string, n: number) => {
      const on = state.sector === value;
      return `<button type="button" class="chip" data-sector="${esc(value)}" aria-pressed="${on}" ${!on && n === 0 ? 'disabled' : ''}>${esc(label)} <span class="chip-n">${n}</span></button>`;
    };
    const allCount = [...f.sectors.values()].reduce((a, b) => a + b, 0);
    sectorsBox.innerHTML = chip('', 'All sectors', allCount) + sectors.map((s) => chip(s, s, f.sectors.get(s) ?? 0)).join('');

    const allRegions = [...f.regions.values()].reduce((a, b) => a + b, 0);
    regionSel.innerHTML =
      `<option value="">All regions (${allRegions})</option>` +
      regions.map((r) => `<option value="${esc(r)}" ${state.region === r ? 'selected' : ''} ${(f.regions.get(r) ?? 0) === 0 && state.region !== r ? 'disabled' : ''}>${esc(r)} (${f.regions.get(r) ?? 0})</option>`).join('');

    list.innerHTML = results.map((r, i) => item(r, data, words, firstDraw && i < 2).value).join('');
    const filtered = !!(state.q || state.sector || state.region);
    status.textContent = filtered
      ? `${results.length} of ${data.companies.length} ${data.companies.length === 1 ? 'company' : 'companies'}`
      : `${data.companies.length} companies`;
    empty.hidden = results.length > 0;
    clearTop.hidden = !filtered || results.length === 0;
    firstDraw = false;

    // Address: shareable, without adding a history entry for every letter.
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.sector) p.set('sector', state.sector);
    if (state.region) p.set('region', state.region);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));

    clearTimeout(trackTimer);
    if (filtered)
      trackTimer = window.setTimeout(() => track('search', { q: state.q, sector: state.sector, region: state.region, results: results.length }), 1200);
  };

  input.addEventListener('input', () => {
    state.q = input.value;
    draw();
  });
  regionSel.addEventListener('change', () => {
    state.region = regionSel.value;
    draw();
  });
  sectorsBox.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-sector]');
    if (!b) return;
    state.sector = state.sector === b.dataset.sector ? '' : b.dataset.sector!;
    draw();
    sectorsBox.querySelector<HTMLButtonElement>(`[data-sector="${CSS.escape(b.dataset.sector!)}"]`)?.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    input.blur(); // closes the keyboard on phones
  });
  root.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('[data-clear]')) return;
    Object.assign(state, { q: '', sector: '', region: '' });
    input.value = '';
    draw();
    input.focus();
  });
  draw();
}

/** "/" puts the cursor in the search box (as on many sites), Escape empties it. */
document.addEventListener('keydown', (e) => {
  const input = document.querySelector<HTMLInputElement>('.index-search input');
  if (!input) return;
  const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]');
  if (e.key === '/' && !typing) {
    e.preventDefault();
    input.focus();
  } else if (e.key === 'Escape' && e.target === input && input.value) {
    input.value = '';
    input.dispatchEvent(new Event('input'));
  }
});
