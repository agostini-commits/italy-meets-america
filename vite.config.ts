import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: { target: 'es2022', sourcemap: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Italy meets America – The Yearbook',
        short_name: 'Italy meets America',
        description: 'The annual guide to the Italian companies ready to meet American partners. By Forbes Italia.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0c2b22',
        theme_color: '#0c2b22',
        categories: ['business', 'books'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell and fonts are precached: the app opens offline after the first visit.
        // + the card data (a few KB): at the first visit the data is fetched before the service worker
        // is active, so without this the yearbook would be empty offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'icons/*.png', 'data/**/*.json', 'img/*/manifest.json'],
        globIgnores: ['**/img/**/*.{webp,jpg,jpeg,png,svg}', '**/company/**', '**/*cyrillic*', '**/*greek*', '**/*vietnamese*'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/img\//, /^\/data\//, /^\/sitemap\.xml$/, /^\/robots\.txt$/],
        runtimeCaching: [
          {
            // Card data: shown from cache at once, refreshed in the background.
            urlPattern: ({ url }) => url.pathname.startsWith('/data/') || url.pathname.endsWith('/manifest.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'ima-data' },
          },
          {
            // Web photos (never the print JPGs, which are heavy and used only when printing).
            urlPattern: ({ url }) => url.pathname.startsWith('/img/') && /\.(webp|svg)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'ima-img', expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 120 } },
          },
        ],
      },
    }),
  ],
});
