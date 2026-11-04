/**
 * One function for all analytics: track(). Not connected to any service yet.
 * To connect Plausible or GA4 later, only setAnalyticsProvider() changes (see README):
 *   setAnalyticsProvider((name, props) => window.plausible?.(name, { props }));
 *   setAnalyticsProvider((name, props) => window.gtag?.('event', name, props));
 */
export type AnalyticsEvent =
  | 'card_view' // a card is shown (flipbook or direct link)
  | 'card_time' // seconds spent on a card, sent when leaving it
  | 'click_email'
  | 'click_website'
  | 'click_social'
  | 'click_us_event'
  | 'search' // search in the index (debounced)
  | 'print' // print dialog opened
  | 'install'; // PWA installed

export type Props = Record<string, string | number | boolean>;
type Provider = (name: AnalyticsEvent, props: Props) => void;

let provider: Provider | null = null;
const queue: [AnalyticsEvent, Props][] = [];

export function setAnalyticsProvider(p: Provider): void {
  provider = p;
  while (queue.length) {
    const [n, pr] = queue.shift()!;
    p(n, pr);
  }
}

export function track(name: AnalyticsEvent, props: Props = {}): void {
  const payload = { ...props, edition: document.documentElement.dataset.edition ?? '' };
  if (import.meta.env.DEV) console.debug('[track]', name, payload);
  if (provider) provider(name, payload);
  else if (queue.length < 200) queue.push([name, payload]);
}

/** Time on card: starts on show, sent on leave (route change, tab hidden, page closed). */
let current: { id: string; start: number } | null = null;

export function cardShown(id: string): void {
  cardLeft();
  current = { id, start: performance.now() };
  track('card_view', { company: id });
}

export function cardLeft(): void {
  if (!current) return;
  const seconds = Math.round((performance.now() - current.start) / 1000);
  if (seconds >= 1) track('card_time', { company: current.id, seconds });
  current = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') cardLeft();
});
window.addEventListener('appinstalled', () => track('install'));

/** Clicks: any element with data-track="click_website" data-company="…" data-label="…". */
document.addEventListener('click', (e) => {
  const el = (e.target as Element | null)?.closest<HTMLElement>('[data-track]');
  if (!el) return;
  const { track: name, ...rest } = el.dataset;
  track(name as AnalyticsEvent, rest as Props);
});
