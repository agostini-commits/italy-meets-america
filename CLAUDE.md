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
- Build order agreed: data + import + validation ✔, app setup ✔, then mobile card, desktop layout, flipbook,
  index, print, PWA checks. Out of v1 (do not build, do not preclude): request an introduction, per-company stats,
  "My selection" PDF, US fairs calendar, AI matchmaker.
- Original photos are not in git (`media/`). Generated images in `public/img` are committed for now; the publish
  pipeline (sheet button → GitHub Action → Drive download → import → images → Netlify) is still to be built.
- There is no HTML preview file (AGO 04/11): the visual reference is the PDF.
- Mobile card (04/11): `src/views/company.ts` + `src/styles/card.css`; quote without quotation marks, as in the PDF.
- Every value from the sheet goes through `html``…`` (escaping) and links through `safeUrl()`.
