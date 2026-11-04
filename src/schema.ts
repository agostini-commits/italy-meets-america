/**
 * Rules shared by the import script (validation) and the app (layout).
 * One place to change a limit: here. Keep the "Checks" tab of the Google Sheet in sync.
 */
export const LIMITS = {
  headline: 32,
  intro: 730, // without the ** markers (decision 04/11/2026: 730 instead of 700)
  mission: 60,
  vision: 60,
  quote: 90,
  who_should_connect: 120,
  what_to_discover: 120,
  signature: 40,
  us_event_name: 60,
  what_they_bring: 250,
  photo_alt: 125,
} as const;

/** gallery = portfolio photos of the Extended Profile; coverPartners = brands on the front cover. */
export const MAX = { signatures: 3, usEvents: 4, emails: 2, gallery: 2, coverPartners: 3 } as const;

/** Minimum size of the original photo (A4 page + 3 mm bleed at 300 dpi ≈ 2551×3579). */
export const PHOTO_MIN = { width: 2600, height: 3600 } as const;

/**
 * The four packages of the media kit (AGO 04/11/2026). Every package has the full-page brand visual (the
 * photo page) and the company page; rank = position in the yearbook (0 first).
 * - Corporate Profile:          2 pages.
 * - Priority Position Profile:  2 pages, in the first pages of the yearbook.
 * - Extended Profile:           2 pages + 2 portfolio pages (one photo each).
 * - Front Cover Partner:        2 pages + the brand name on the front cover (max 3 brands), first of all.
 */
export const PACKAGES = ['corporate', 'priority', 'extended', 'cover_partner'] as const;
export const PACKAGE_INFO = {
  corporate: { label: 'Corporate Profile', pages: 2, portfolio: 0, rank: 2 },
  priority: { label: 'Priority Position Profile', pages: 2, portfolio: 0, rank: 1 },
  extended: { label: 'Extended Profile', pages: 4, portfolio: 2, rank: 2 },
  cover_partner: { label: 'Front Cover Partner', pages: 2, portfolio: 0, rank: 0 },
} as const;
/** Names used before the media kit: still read (with a warning) so an old sheet keeps working. */
export const PACKAGE_ALIASES: Record<string, (typeof PACKAGES)[number]> = { base: 'corporate', premium: 'extended' };
export const STATUSES = ['draft', 'to_client', 'in_review', 'approved', 'published'] as const;
/** Only these statuses end up in the app, in print and in InDesign. */
export const PUBLIC_STATUSES = ['approved', 'published'] as const;

export const SOCIALS = ['facebook', 'instagram', 'linkedin', 'youtube', 'whatsapp'] as const;

/** Responsive web sizes generated from every photo (srcset). */
export const WEB_WIDTHS = [600, 1000, 1600] as const;
/** Print version: 300 dpi JPG, longest side. */
export const PRINT_LONG_SIDE = 3600;
