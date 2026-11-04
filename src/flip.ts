/**
 * Flipbook behaviour: keyboard (← →, PageUp/PageDown), swipe with the card following the finger,
 * slide when turning (View Transitions API, skipped with reduced motion or old browsers),
 * preload of the next and previous photos so the next card shows at once.
 */
import type { EditionData } from './data';
import { navigate } from './router';

export type Dir = 'prev' | 'next';
export type Via = 'button' | 'key' | 'swipe';

let pending: { dir: Dir; via: Via } | null = null;

/** Direction and source of the last page turn (read once by the render). */
export function takeFlip(): { dir: Dir; via: Via } | null {
  const p = pending;
  pending = null;
  return p;
}

function flipLink(dir: Dir): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>(`.flip [data-flip="${dir}"]`);
}

export function flip(dir: Dir, via: Via): boolean {
  const a = flipLink(dir);
  if (!a) return false;
  pending = { dir, via };
  navigate(a.getAttribute('href')!);
  return true;
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Runs the DOM update inside a slide transition when possible. */
export function withTransition(dir: Dir | null, update: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (!dir || reducedMotion() || !doc.startViewTransition) {
    update();
    return;
  }
  document.documentElement.dataset.flip = dir;
  const t = doc.startViewTransition(update) as { finished: Promise<void>; ready?: Promise<void> };
  // A transition can be skipped (e.g. the phone toolbar resizes the viewport): the page still changes.
  t.ready?.catch(() => {});
  t.finished.catch(() => {}).finally(() => delete document.documentElement.dataset.flip);
}

/** Warms the cache with the photos of the neighbouring cards (the browser picks the right size). */
export function preloadNeighbours(data: EditionData, index: number): void {
  const run = () => {
    for (const c of [data.companies[index + 1], data.companies[index - 1]]) {
      const info = c && data.images[c.photo.file];
      if (!info || info.svg) continue;
      const img = new Image();
      img.decoding = 'async';
      img.sizes = matchMedia('(min-width: 900px)').matches ? '38vw' : '100vw';
      img.srcset = Object.entries(info.web).map(([w, u]) => `${u} ${w}w`).join(', ');
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 400);
}

export function setupFlip(): void {
  // Buttons: remember the direction for the slide.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('.flip [data-flip]');
    if (a) pending = { dir: a.dataset.flip as Dir, via: 'button' };
  }, true);

  // Keyboard, never while typing.
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
    if (!document.querySelector('.flipbook')) return;
    const dir: Dir | null = e.key === 'ArrowLeft' || e.key === 'PageUp' ? 'prev' : e.key === 'ArrowRight' || e.key === 'PageDown' ? 'next' : null;
    if (dir && flip(dir, 'key')) e.preventDefault();
  });

  // Swipe: horizontal only, decided after 10 px of movement, so the vertical scroll is never taken as a swipe.
  let start: { x: number; y: number; t: number; id: number } | null = null;
  let axis: 'x' | 'y' | null = null;
  let card: HTMLElement | null = null;

  const reset = (animate: boolean) => {
    if (!card) return;
    const c = card;
    c.classList.remove('is-dragging');
    if (animate) c.classList.add('is-settling');
    c.style.transform = '';
    c.style.opacity = '';
    if (animate) setTimeout(() => c.classList.remove('is-settling'), 260);
  };

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    card = (e.target as Element).closest<HTMLElement>('.flipbook .card');
    if (!card) return;
    start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    axis = null;
  }, { passive: true });

  document.addEventListener('pointermove', (e) => {
    if (!start || !card || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!axis && Math.hypot(dx, dy) > 10) axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
    if (axis !== 'x' || reducedMotion()) return;
    const canGo = !!flipLink(dx < 0 ? 'next' : 'prev');
    const move = canGo ? dx * 0.6 : dx * 0.15; // resistance at the ends
    card.classList.add('is-dragging');
    card.style.transform = `translateX(${move}px)`;
    card.style.opacity = String(1 - Math.min(Math.abs(move) / innerWidth, 0.35));
  }, { passive: true });

  const end = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const fast = Math.abs(dx) / (performance.now() - start.t) > 0.5; // px per ms
    const isSwipe = axis === 'x' && (Math.abs(dx) > innerWidth * 0.22 || (fast && Math.abs(dx) > 40));
    start = null;
    if (isSwipe && flip(dx < 0 ? 'next' : 'prev', 'swipe')) {
      card = null;
      return;
    }
    reset(true);
    card = null;
  };
  document.addEventListener('pointerup', end, { passive: true });
  document.addEventListener('pointercancel', (e) => {
    if (start && e.pointerId === start.id) {
      start = null;
      reset(true);
      card = null;
    }
  }, { passive: true });
}
