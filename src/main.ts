import '@fontsource-variable/inter';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/700-italic.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/card.css';

import { registerSW } from 'virtual:pwa-register';
import { cardLeft, cardShown } from './analytics';
import { currentEdition, loadEdition, type EditionData } from './data';
import { type Raw } from './lib/html';
import { navigate, startRouter, url, type Route } from './router';
import { companiesView } from './views/companies';
import { companyView } from './views/company';
import { coverView } from './views/cover';
import { messageView, pageView, printView } from './views/pages';
import { shell, type Section } from './views/shell';

registerSW({ immediate: true });

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
function show(edition: number, section: Section, content: Raw, title: string) {
  document.documentElement.dataset.edition = String(edition);
  document.title = title;
  app.innerHTML = shell(edition, section, content).value;
  window.scrollTo(0, 0);
}

let firstRender = true;
async function render(route: Route) {
  cardLeft();
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
        const c = data.companies.find((x) => x.id === route.id)!;
        show(ed, 'company', view, `${c.name} – ${base} | Forbes Italia`);
        cardShown(c.id);
        break;
      }
      case 'companies':
        show(ed, 'companies', companiesView(data), `Companies – ${base}`);
        break;
      case 'print':
        show(ed, 'print', printView(data), `Print – ${base}`);
        break;
      case 'page':
        show(ed, 'page', pageView(data, route.page), `${route.page === 'editorial' ? 'Editorial' : 'Colophon'} – ${base}`);
        break;
    }
    // After a navigation, move focus to the content (screen readers), not on the first load.
    if (!firstRender) document.getElementById('main')?.focus({ preventScroll: true });
    firstRender = false;
  } catch (e) {
    console.error(e);
    app.innerHTML = messageView('Something went wrong', 'Check your connection and try again.').value;
  }
}

// --- flipbook: keyboard and swipe --------------------------------------------------
function flip(dir: 'prev' | 'next') {
  const a = document.querySelector<HTMLAnchorElement>(`[data-flip="${dir}"]`);
  if (a) navigate(a.getAttribute('href')!);
}
document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target as HTMLElement;
  if (t.closest('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'ArrowLeft') flip('prev');
  if (e.key === 'ArrowRight') flip('next');
});
let touch: { x: number; y: number; t: number } | null = null;
document.addEventListener('touchstart', (e) => {
  const p = e.changedTouches[0];
  touch = { x: p.clientX, y: p.clientY, t: Date.now() };
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!touch || !document.querySelector('.card')) return;
  const p = e.changedTouches[0];
  const dx = p.clientX - touch.x;
  const dy = p.clientY - touch.y;
  // Horizontal, decisive and quick: the vertical scroll of the card is never taken as a swipe.
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - touch.t < 600) flip(dx < 0 ? 'next' : 'prev');
  touch = null;
}, { passive: true });

window.addEventListener('pagehide', cardLeft);
startRouter((route) => void render(route));
