/**
 * Routes (every card has its own shareable URL):
 *   /                          → current edition
 *   /company/<id>              → same card in the current edition (old or short links)
 *   /<edition>/                → cover and contents
 *   /<edition>/company/<id>    → flipbook on that card
 *   /<edition>/companies       → index with search and filters
 *   /<edition>/print           → print selection
 *   /<edition>/editorial | /<edition>/colophon
 */
export type Route =
  | { name: 'home' }
  | { name: 'short'; id: string }
  | { name: 'cover'; edition: number }
  | { name: 'company'; edition: number; id: string }
  | { name: 'companies'; edition: number }
  | { name: 'print'; edition: number }
  | { name: 'page'; edition: number; page: 'editorial' | 'colophon' }
  | { name: 'notfound' };

export function parseRoute(pathname: string): Route {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'company' && parts[1]) return { name: 'short', id: parts[1] };
  const edition = Number(parts[0]);
  if (!/^\d{4}$/.test(parts[0])) return { name: 'notfound' };
  if (parts.length === 1) return { name: 'cover', edition };
  if (parts[1] === 'company' && parts[2]) return { name: 'company', edition, id: parts[2] };
  if (parts[1] === 'companies') return { name: 'companies', edition };
  if (parts[1] === 'print') return { name: 'print', edition };
  if (parts[1] === 'editorial' || parts[1] === 'colophon') return { name: 'page', edition, page: parts[1] };
  return { name: 'notfound' };
}

export const url = {
  cover: (ed: number) => `/${ed}/`,
  company: (ed: number, id: string) => `/${ed}/company/${encodeURIComponent(id)}`,
  companies: (ed: number) => `/${ed}/companies`,
  print: (ed: number) => `/${ed}/print`,
  page: (ed: number, p: 'editorial' | 'colophon') => `/${ed}/${p}`,
};

type Listener = (route: Route, url: URL) => void;
let listener: Listener | null = null;

export function navigate(to: string, replace = false): void {
  if (replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  listener?.(parseRoute(location.pathname), new URL(location.href));
}

/** Internal links (<a href="/…">) are handled without reloading the page. */
export function startRouter(fn: Listener): void {
  listener = fn;
  window.addEventListener('popstate', () => fn(parseRoute(location.pathname), new URL(location.href)));
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('/') || a.target || a.hasAttribute('download')) return;
    e.preventDefault();
    navigate(href);
  });
  fn(parseRoute(location.pathname), new URL(location.href));
}
