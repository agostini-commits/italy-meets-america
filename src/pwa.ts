/**
 * PWA: service worker, offline, "Install the app".
 * - The service worker precaches the app and the card data; photos are cached when seen.
 * - At the first visit the photos on screen were downloaded before the service worker was active:
 *   when it takes control they are requested again, so they are available offline too.
 * - Offline, a photo never seen shows its dominant colour instead of a broken image.
 * - Install: Chrome/Edge/Android use the browser prompt; iPhone/iPad (no prompt) get the two steps.
 */
import { registerSW } from 'virtual:pwa-register';
import { track } from './analytics';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallPrompt | null = null;

const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Shows the install buttons only where installing is possible and the app is not installed yet. */
export function refreshInstallButtons(): void {
  const can = !standalone() && (deferred !== null || isIos());
  document.querySelectorAll<HTMLElement>('[data-install]').forEach((b) => (b.hidden = !can));
}

function iosHelp(): void {
  let d = document.getElementById('ima-install-help') as HTMLDialogElement | null;
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'ima-install-help';
    d.className = 'install-help';
    d.innerHTML = `<h2>Install the yearbook</h2>
      <ol><li>Tap <b>Share</b> <span aria-hidden="true">(the square with the arrow)</span> in Safari.</li>
      <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>
      <p>It opens like an app and works offline.</p>
      <form method="dialog"><button class="btn">OK</button></form>`;
    document.body.append(d);
  }
  d.showModal();
}

export function setupPwa(): void {
  registerSW({ immediate: true });

  if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      const urls = new Set<string>();
      document.querySelectorAll('img').forEach((i) => i.currentSrc && urls.add(i.currentSrc));
      urls.forEach((u) => fetch(u).catch(() => {}));
    }, { once: true });
  }

  // Broken image (offline, never seen): keep the dominant-colour background, hide the broken icon.
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t instanceof HTMLImageElement) t.classList.add('img-offline');
  }, true);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    refreshInstallButtons();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    refreshInstallButtons();
  });

  document.addEventListener('click', async (e) => {
    if (!(e.target as Element | null)?.closest('[data-install]')) return;
    if (deferred) {
      const p = deferred;
      deferred = null;
      await p.prompt();
      const { outcome } = await p.userChoice;
      track('install', { outcome, how: 'prompt' });
      refreshInstallButtons();
    } else if (isIos()) {
      track('install', { outcome: 'help', how: 'ios' });
      iosHelp();
    }
  });
}
