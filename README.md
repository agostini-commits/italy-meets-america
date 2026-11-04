# Italy meets America – The Yearbook

Web app (PWA) of the annual Forbes Italia yearbook presenting Italian companies to American buyers and partners.
Static site: Vite + TypeScript (no framework), plain CSS, vite-plugin-pwa, Netlify.

## Quick start

```bash
npm ci
npm run import-data   # sheet (CSV) → data/companies.json + validation report
npm run images        # media/originals → public/img (WebP 600/1000/1600, 300 dpi JPG, Open Graph)
npm run dev           # http://localhost:5173
npm run build         # dist/ + one HTML page per card with Open Graph + _redirects + sitemap
npm test              # validation tests
```

## Where things are

| Path | What |
|---|---|
| `config/editions.json` | Editions (year, title, cover photo, which one is current). |
| `config/lists.json` | Sectors and regions: **mirror of the "Lists" tab of the sheet**. |
| `data/source/companies.csv` | Last CSV exported from the sheet (used when no URL is given). |
| `data/companies.json` | All published cards (generated, committed: the diff shows what changed). |
| `data/import-report.md` | Report of the last import: errors, warnings, inconsistent sectors, photos. |
| `public/data/<edition>/companies.json` | What the app loads (generated). |
| `public/img/<edition>/…` | Generated images + `manifest.json` (sizes, dominant colour). |
| `media/originals/` | Original photos and logos, from the Drive folder. **Not in git.** |
| `src/schema.ts` | Character limits and image sizes, shared by import and app. |
| `scripts/` | `import-data`, `build-images`, `make-icons`, `prerender` (post-build). |
| `src/` | App: `router.ts`, `data.ts`, `analytics.ts`, `views/`, `styles/`. |

## The Google Sheet

"Italy meets America – Yearbook DATA": https://docs.google.com/spreadsheets/d/15YCZ1CYHhVl9hOGppfjQOQt8_ToyUsPOeoBenA6RxKg/edit

- **Companies**: one row = one card. Row 1 = column names (they are the JSON keys: do not rename them).
  Columns starting with `_` are internal (client contact, account owner, notes) and are **never** imported.
- **Checks**: the same checks as the import, live in the sheet.
- **Summary**, **InDesign** (Data Merge export), **Fields** (guide), **Lists** (sectors, regions, settings).
- Workflow: `draft → to_client → in_review → approved → published`. Only `approved` and `published` go online.

### CSV format

UTF-8, comma separated, header in the first row, the columns of `scripts/lib/csv.ts` (`EXPECTED_COLUMNS`).
Repeated fields are numbered (`signature_1..3`, `us_event_1..4_name/_url`, `email_1..2`, `gallery_1..6`).
Bold in the intro: `**one passage**`. Images: file names only (`bellavista-photo.jpg`), files in the Drive folder.

### Updating the data from the sheet

**Publish to site** (menu "Italy meets America" in the sheet) starts `.github/workflows/publish.yml`: sheet read with a
service account (`npm run fetch-sheet`, internal `_` columns dropped), new or changed photos from the Drive folder
(`npm run fetch-drive`), `import-data --strict`, `images`, `build`, Netlify deploy, result in the `_Publish` tab
(`npm run publish-log`). Setup and troubleshooting: `docs/PUBLISH-SETUP.md`. The sheet is **not** published on the web.

Locally, with the same environment variables: `npm run publish` (everything except the deploy).

### Validation (report)

- **errors** (card not published): missing required field, text over the limit, invalid id/slug, duplicate id in
  the same edition, sector/region not in the list, invalid email, link not https, founding year, more than one bold
  passage, package not in the list, portfolio photos on a package other than the Extended Profile or in
  gallery_3..6, more than 3 Front Cover Partners in an edition;
- **warnings**: photo below 2600×3600 px (fine on the web, not for print), landscape photo, logo below 800 px,
  missing file, sector or region written differently and auto-corrected (e.g. "food and beverage", "Lombardia"),
  Extended Profile with fewer than 2 portfolio photos, old package names (base, premium: still read).

## Packages (media kit, AGO 04/11/2026)

| `package` | Media kit | Pages | Where |
|---|---|---|---|
| `cover_partner` | Front Cover Partner | brand visual + company page | name on the cover ("With …", max 3), first in the yearbook |
| `priority` | Priority Position Profile | brand visual + company page | right after the cover partners |
| `corporate` | Corporate Profile | brand visual + company page | by sector |
| `extended` | Extended Profile | + 2 portfolio pages, one photo each (`gallery_1`, `gallery_2`) | by sector |

The brand visual is the full-page photo (`photo`). Order: cover partners, priority (both by `sort_order`, shown as
"Featured" in the contents), then the rest by sector list and `sort_order` (`scripts/lib/order.ts`, tests). Rules in
`PACKAGE_INFO` (`src/schema.ts`).

## Images

`npm run images` processes only new or changed originals (size + date), `--force` redoes all.
For every photo: WebP at the real widths up to 600/1000/1600 (never enlarged: a 907 px photo gets 600 and 907),
a 300 dpi sRGB JPG (long side 3600 px) used only in print, and a 1200×630 JPG for link previews.

## Print

`/2026/print`: format **Magazine** (2 A4 portrait pages per card, 4 for the Extended Profile) or **Single sheet**
(1 A4 landscape page, 2 for the Extended Profile), cover, **For the printer** (3 mm bleed + crop marks: page = A4 + 10 mm per side), page selection
(all / none / sector / company), preview of the real sheets and "Print / Save as PDF".
- Sheets are built in mm/pt (`src/views/print.ts`, `src/styles/print.css`); page sizes are named pages written at
  run time (`@page portrait` / `landscape`). Plan and page numbers in `src/print-plan.ts` (tests).
- Page numbers = position in the whole yearbook (cover = 1), so a card keeps its number in any selection.
- The 300 dpi JPGs are loaded only when printing; a sheet whose text does not fit shows a warning (not printed).
- A card with every field at its maximum length fits both formats (tested with a synthetic card).
- Browsers cannot write PDF TrimBox/BleedBox: the printer reads trim from the crop marks.

## PWA and speed

- Precache (service worker): app, fonts, card data and image manifest (≈ 375 KB). Photos are cached when seen;
  at the first visit the photos on screen are requested again once the service worker takes control.
  Offline, a photo never seen shows its dominant colour. Install button on the cover (`src/pwa.ts`):
  browser prompt on Chrome/Edge/Android, instructions on iPhone/iPad.
- `scripts/prerender.ts` writes each card page and the edition cover **already drawn**, with the CSS inline and
  preloads for the photo and the data: the first card shows in ~0.5 s on 4G. The app keeps the pre-drawn page on
  start (`data-prerendered`) and takes over from there.
- Lighthouse mobile (04/11/2026): Performance 97–98, Accessibility 100, Best practices 100, SEO 100.
- Test checklist and how to update the data: `docs/CHECKLIST-V1.md`.

## Analytics

All events go through `track()` in `src/analytics.ts` (card_view, card_time, click_email, click_website,
click_social, click_us_event, search, print, install). Nothing is sent until a provider is set:

```ts
setAnalyticsProvider((name, props) => window.plausible?.(name, { props }));          // Plausible
setAnalyticsProvider((name, props) => window.gtag?.('event', name, props));          // GA4
```

## Editions

URLs carry the edition: `/2026/`, `/2026/company/<id>`, `/2026/companies`, `/2026/print`.
`/` and `/company/<id>` go to the current edition (`"current": true` in `config/editions.json`).
New edition: add it to `config/editions.json`, duplicate the rows in the sheet with the new `edition`, move `current`.

## Deploy (Netlify)

Only the GitHub Action deploys (Netlify CLI, `--no-build`): do not link the repository in Netlify, it would publish
the data stored in the repository instead of the sheet. `SITE_URL` is used for the Open Graph image addresses.
