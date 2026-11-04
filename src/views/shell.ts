import { html, raw, type Raw } from '../lib/html';
import { url } from '../router';

export type Section = 'cover' | 'company' | 'companies' | 'print' | 'page';

/** Interface bar (never printed). The card itself is always "paper", in light and dark theme. */
export function shell(edition: number, active: Section, content: Raw): Raw {
  const link = (href: string, label: string, key: Section) =>
    html`<a class="nav-${key === 'cover' ? 'contents' : key}" href="${href}" ${active === key ? html`aria-current="page"` : ''}>${label}</a>`;
  return html`
    <header class="bar no-print">
      <a class="brand" aria-label="Italy meets America ${edition}, contents" href="${url.cover(edition)}"><span class="brand-kicker">Forbes Italia</span> Italy meets America <span class="brand-ed">${edition}</span></a>
      <nav aria-label="Main">
        ${link(url.cover(edition), 'Contents', 'cover')}
        ${link(url.companies(edition), 'Companies', 'companies')}
        ${link(url.print(edition), 'Print', 'print')}
      </nav>
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch light or dark theme">${raw('<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>')}</button>
    </header>
    <main id="main" tabindex="-1">${content}</main>`;
}
