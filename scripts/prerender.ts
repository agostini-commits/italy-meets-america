/**
 * Runs after `vite build`. A static site has a single index.html: LinkedIn, WhatsApp and search
 * engines do not run JavaScript, so every card gets its own HTML page with title, description and
 * photo (Open Graph). Writes also:
 *   dist/_redirects   / → current edition, /company/<id> → current edition (Netlify)
 *   dist/sitemap.xml, dist/robots.txt
 * Site address: env SITE_URL, otherwise URL (set by Netlify during the build).
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Company, Edition, ImageInfo } from '../src/types';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const SITE = (process.env.SITE_URL ?? process.env.URL ?? 'https://italymeetsamerica.netlify.app').replace(/\/$/, '');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

function meta(p: { title: string; description: string; url: string; image?: string | null; imageAlt?: string }) {
  return [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<link rel="canonical" href="${esc(p.url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="Italy meets America – Forbes Italia" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${esc(p.url)}" />`,
    ...(p.image
      ? [
          `<meta property="og:image" content="${esc(SITE + p.image)}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="${esc(p.imageAlt ?? '')}" />`,
          `<meta name="twitter:image" content="${esc(SITE + p.image)}" />`,
        ]
      : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');
}

async function main() {
  const template = await readFile(join(DIST, 'index.html'), 'utf8');
  const block = /<!-- meta:start[\s\S]*?<!-- meta:end -->/;
  if (!block.test(template)) throw new Error('index.html: meta:start / meta:end markers not found');
  const page = (m: string) => template.replace(block, m);

  const editions: Edition[] = JSON.parse(await readFile(join(DIST, 'data/editions.json'), 'utf8'));
  const current = editions.find((e) => e.current) ?? editions[editions.length - 1];
  const urls: string[] = [];
  let count = 0;

  for (const ed of editions) {
    const companies: Company[] = JSON.parse(await readFile(join(DIST, `data/${ed.edition}/companies.json`), 'utf8'));
    const mPath = join(DIST, `img/${ed.edition}/manifest.json`);
    const images: Record<string, ImageInfo> = existsSync(mPath) ? JSON.parse(await readFile(mPath, 'utf8')) : {};

    const coverUrl = `${SITE}/${ed.edition}/`;
    await mkdir(join(DIST, String(ed.edition)), { recursive: true });
    await writeFile(
      join(DIST, String(ed.edition), 'index.html'),
      page(meta({ title: `${ed.title} – The Yearbook ${ed.edition} | Forbes Italia`, description: ed.tagline, url: coverUrl, image: images[ed.cover_photo]?.og, imageAlt: ed.cover_photo_alt })),
    );
    urls.push(coverUrl, `${SITE}/${ed.edition}/companies`);

    for (const c of companies) {
      const dir = join(DIST, String(ed.edition), 'company', c.id);
      const pageUrl = `${SITE}/${ed.edition}/company/${c.id}`;
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, 'index.html'),
        page(
          meta({
            title: `${c.name}: ${c.headline} | Italy meets America ${ed.edition}`,
            description: cut(`${c.city}, ${c.region} · ${c.sector}. ${c.what_they_bring}`, 200),
            url: pageUrl,
            image: images[c.photo.file]?.og,
            imageAlt: c.photo.alt,
          }),
        ),
      );
      urls.push(pageUrl);
      count++;
    }
  }

  const redirects = current
    ? [`/  /${current.edition}/  302`, `/company/*  /${current.edition}/company/:splat  301`, `/*  /index.html  200`]
    : [`/*  /index.html  200`];
  await writeFile(join(DIST, '_redirects'), redirects.join('\n') + '\n');
  await writeFile(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`,
  );
  await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`✔ Prerender: ${count} card pages with Open Graph, site ${SITE}`);
}

main().catch((e) => {
  console.error('⛔', e instanceof Error ? e.message : e);
  process.exit(1);
});
