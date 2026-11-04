import '@fontsource-variable/inter';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/700-italic.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/card.css';
import './styles/flip.css';
import './styles/index.css';
import './styles/print.css';

import { cardLeft, cardShown } from './analytics';
import { preloadNeighbours, setupFlip, takeFlip, withTransition } from './flip';
import { refreshInstallButtons, setupPwa } from './pwa';
import { currentEdition, loadEdition, type EditionData } from './data';
import { type Raw } from './lib/html';
import { navigate, startRouter, url, type Route } from './router';
import { companiesView, mountIndex } from './views/companies';
import { companyView } from './views/company';
import { coverView } from './views/cover';
import { messageView, pageView } from './views/pages';
import { mountPrint, printView } from './views/print';
import { shell, type Section } from './views/shell';

setupPwa();

const app = document.getElementById('app')!;

// --- theme (interface only: the card stays "paper") ------------------------------
const THEME_KEY = 'ima-theme';
function applyTheme(t: string | null) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
try {
  applyTheme(localStorage.getItem(THEME_KEY));
} catch {
  /* private mode: follow the system */
}
document.addEventListener('click', (e) => {
  if (!(e.target as Element | null)?.closest('[data-theme-toggle]')) return;
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* ignore */
  }
});

// --- rendering -------------------------------------------------------------------
/**
 * Page already drawn by scripts/prerender.ts for this address: on the first render it is kept as it is
 * (redrawing it would only delay the "largest contentful paint" on slow connections).
 */
let prerendered = app.dataset.prerendered ?? '';
function show(edition: number, section: Section, content: Raw, title: string) {
  document.documentElement.dataset.edition = String(edition);
  document.title = title;
  const here = location.pathname.replace(/\/+$/, '');
  if (prerendered && prerendered === here) {
    prerendered = '';
    return;
  }
  prerendered = '';
  delete app.dataset.prerendered;
  app.innerHTML = shell(edition, section, content).value;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

let firstRender = true;
async function render(route: Route) {
  cardLeft();
  const turn = takeFlip();
  try {
    if (route.name === 'home') {
      const ed = await currentEdition();
      return ed ? navigate(url.cover(ed.edition), true) : (app.innerHTML = messageView('Coming soon', 'The yearbook is being prepared.').value);
    }
    if (route.name === 'short') {
      const ed = await currentEdition();
      return navigate(ed ? url.company(ed.edition, route.id) : '/', true);
    }
    if (route.name === 'notfound') {
      app.innerHTML = messageView('Page not found', 'This page does not exist.').value;
      return;
    }
    const data: EditionData = await loadEdition(route.edition);
    const ed = route.edition;
    const base = `Italy meets America ${ed}`;
    switch (route.name) {
      case 'cover':
        show(ed, 'cover', coverView(data), `${base} – The Yearbook | Forbes Italia`);
        break;
      case 'company': {
        const view = companyView(data, route.id);
        if (!view) {
          show(ed, 'company', messageView('Company not found', 'This card is not in the yearbook.'), base);
          break;
        }
        const index = data.companies.findIndex((x) => x.id === route.id);
        const c = data.companies[index];
        withTransition(turn?.dir ?? null, () => {
          show(ed, 'company', view, `${c.name} – ${base} | Forbes Italia`);
          // Keyboard users keep the focus on the button they pressed.
          if (turn?.via === 'button') document.querySelector<HTMLElement>(`.flip-${turn.dir}`)?.focus({ preventScroll: true });
        });
        cardShown(c.id, turn?.via ?? 'link');
        preloadNeighbours(data, index);
        break;
      }
      case 'companies':
        show(ed, 'companies', companiesView(data), `Companies – ${base}`);
        mountIndex(data);
        break;
      case 'print':
        show(ed, 'print', printView(data), `Print – ${base}`);
        mountPrint(data);
        break;
      case 'page':
        show(ed, 'page', pageView(data, route.page), `${route.page === 'editorial' ? 'Editorial' : 'Colophon'} – ${base}`);
        break;
    }
    // After a navigation, move focus to the content (screen readers), not on the first load.
    refreshInstallButtons();
    if (!firstRender && !turn) document.getElementById('main')?.focus({ preventScroll: true });
    firstRender = false;
  } catch (e) {
    console.error(e);
    app.innerHTML = messageView('Something went wrong', 'Check your connection and try again.').value;
  }
}

window.addEventListener('pagehide', cardLeft);
setupFlip();
startRouter((route) => void render(route));
