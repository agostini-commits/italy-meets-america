# CLAUDE.md — Italy meets America (Yearbook Forbes Italia)

Handoff for Claude Code. Full documentation in README.md.

- Owner: Andrea Agostini (CMO BFC Media). Interface and content in **English** (US audience); notes for the team in Italian.
- Data source: Google Sheet "Italy meets America – Yearbook DATA" (`15YCZ1CYHhVl9hOGppfjQOQt8_ToyUsPOeoBenA6RxKg`),
  tabs Companies, Checks, Summary, InDesign, Fields, Lists. The "Checks" formulas mirror `scripts/lib/validate.ts`:
  if a limit changes, change `src/schema.ts` **and** the Checks formula and the red highlight in the sheet.
- Decisions (AGO 04/11/2026): intro limit **730** (not 700: two of the three approved sample intros are 714 and 723);
  headline 32; status workflow; `quote_role` separate; bold with `**…**`; internal columns start with `_`;
  under the name always CITY | REGION in English; Domori is Food & Beverage (the PDF said Fashion & Luxury).
- Sample data: the 3 companies of the PDF. Sample photos are extracted from the PDF (907–1196 px wide): the report
  flags them as too small for print, that is expected. Logos are missing (vector in the PDF).
- Build order agreed: data + import + validation ✔, app setup ✔, mobile card ✔, desktop ✔, flipbook ✔,
  index ✔, print ✔, PWA checks ✔ (docs/CHECKLIST-V1.md). Publish pipeline ✔ (04/11, docs/PUBLISH-SETUP.md). Card order = cover partners, priority, then by sector (media kit, AGO 04/11). Out of v1 (do not build, do not preclude): request an introduction, per-company stats,
  "My selection" PDF, US fairs calendar, AI matchmaker.
- Publish (04/11): sheet menu `apps-script/Publish.gs` → `.github/workflows/publish.yml` (fetch-sheet, fetch-drive,
  import --strict, images, build, Netlify CLI deploy, `_Publish` log in the sheet). Service account, never "publish to web"
  (internal `_` columns). Only the Action deploys: the repo is NOT linked in Netlify. Photo folder on Drive:
  `1GhsGf2eXrM9wU8BdjxjBFD4Y07rtdw-k`. Original photos are not in git (`media/`, cached by the Action).
- Company form (04/11): `apps-script/Form.gs` (FormApp, created once from the sheet menu, no login required): answers →
  Companies rows in `draft` (`imaFormToRow_` is pure; question titles are the keys, do not rename). Photos by link, not upload.
  Limits in `IMA_FORM.MAX` = `src/schema.ts`. Tested in Node with mocked Google services (scratch script).
  Two parts (AGO 04/11): 1 company story (marketing, English, 30': what the slide promises), 2 practical data (minutes). Address, city,
  region from the Google Maps link of the headquarters (`imaPlaceFromMaps_`, Maps geocoder; never typed). Menu
  "Rebuild the company form" (same link) and "Short link and slide" (forms.gle into the slide `IMA_FORM.SLIDE_ID`).
- Packages = the 4 of the media kit (AGO 04/11): `corporate`, `priority`, `extended` (+2 portfolio pages, 1 photo each),
  `cover_partner` (name on the cover, max 3). Brand visual = the photo page; the ad material is handled outside the form.
  `PACKAGE_INFO` in `src/schema.ts`; base/premium still read with a warning. Sheet: Lists C2:C5, Checks, Summary, InDesign
  (yearbook order + package + @portfolio_1/2) follow the same rules.
- There is no HTML preview file (AGO 04/11): the visual reference is the PDF.
- Mobile card (04/11): `src/views/company.ts` + `src/styles/card.css`; quote without quotation marks, as in the PDF.
- Desktop (AGO 04/11, option 1): spread with photo 38% / text 62%, text 13–16 px; width rule in `card.css`
  (fits 297:210 on screens ≥ ~1050 px tall, on laptops grows a little: ~840 px is the shortest a card gets at 13 px).
- Flipbook (04/11): `src/flip.ts` (keys, swipe, slide with View Transitions, preload), `src/styles/flip.css`;
  `card_view` carries `via` (link, button, key, swipe). Order of the cards = import order (`scripts/lib/order.ts`).
- Index (04/11): search and filters in `src/search.ts` (pure, tests), page in `src/views/companies.ts`
  (state in the address ?q=&sector=&region=, "/" focuses the search). Searched fields: name, city/region, sector,
  buyers, US events, discover, signature, what they bring, legal name.
- Print (04/11): `src/print-plan.ts` (pure, tests), `src/views/print.ts`, `src/styles/print.css`. If the card layout
  changes, check the worst case (every field at max length) in both formats: Single sheet is the tight one.
- PWA/speed (04/11): `src/pwa.ts`; prerender draws cards and cover in the HTML (CSS inline, preloads) and the app
  keeps that page on start (`data-prerendered`): views used by prerender must not touch the DOM at import time.
  The data JSONs are precached (needed offline). Measure LCP with the real browser (scratch script), not only Lighthouse.
- Every value from the sheet goes through `html``…`` (escaping) and links through `safeUrl()`.
