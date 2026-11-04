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

1. In the sheet: File → Share → Publish to web → tab **Companies** → **CSV** → Publish. Copy the link.
2. Once: in Netlify (Site configuration → Environment variables) add `SHEET_CSV_URL` = that link.
   Locally: `SHEET_CSV_URL=… npm run import-data` or `npm run import-data -- --url "…"`.
3. Without the link: File → Download → CSV of the Companies tab, save it as `data/source/companies.csv`, then `npm run import-data`.
4. Read `data/import-report.md`. A row with errors is **not** published; with `--strict` (automatic in CI) the
   import fails if an approved row has errors, so a company never disappears silently.

### Validation (report)

- **errors** (card not published): missing required field, text over the limit, invalid id/slug, duplicate id in
  the same edition, sector/region not in the list, invalid email, link not https, founding year, more than one bold
  passage, gallery on a base card;
- **warnings**: photo below 2600×3600 px (fine on the web, not for print), landscape photo, logo below 800 px,
  missing file, sector or region written differently and auto-corrected (e.g. "food and beverage", "Lombardia"),
  premium card without gallery.

## Images

`npm run images` processes only new or changed originals (size + date), `--force` redoes all.
For every photo: WebP at the real widths up to 600/1000/1600 (never enlarged: a 907 px photo gets 600 and 907),
a 300 dpi sRGB JPG (long side 3600 px) used only in print, and a 1200×630 JPG for link previews.

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

Build command `npm run build`, publish `dist` (see `netlify.toml`). `SITE_URL` (or Netlify's `URL`) is used for
the Open Graph image addresses.
