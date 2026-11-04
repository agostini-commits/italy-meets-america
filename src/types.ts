import type { PACKAGES, STATUSES, SOCIALS } from './schema';

export type Package = (typeof PACKAGES)[number];
export type Status = (typeof STATUSES)[number];
export type Social = (typeof SOCIALS)[number];

/** A piece of the intro: the app renders `bold` parts in <strong>. No HTML in the data. */
export interface TextPart {
  text: string;
  bold: boolean;
}

export interface UsEvent {
  name: string;
  url: string | null;
}

export interface ImageRef {
  /** File name as written in the sheet (e.g. "bellavista-photo.jpg"). */
  file: string;
  alt: string;
}

/** One card, as written in data/companies.json and public/data/<edition>/companies.json. */
export interface Company {
  id: string;
  edition: number;
  status: Status;
  package: Package;
  sort_order: number | null;
  sector: string;
  sector_slug: string;
  name: string;
  city: string;
  region: string;
  headline: string;
  intro: string;
  intro_parts: TextPart[];
  mission: string;
  vision: string;
  quote: string;
  quote_author: string;
  quote_role: string | null;
  who_should_connect: string;
  what_to_discover: string;
  since: number;
  signature: string[];
  us_events: UsEvent[];
  what_they_bring: string;
  company_legal_name: string;
  address: { street: string; city: string; country: string };
  emails: string[];
  website: string;
  website_label: string;
  social: Partial<Record<Social, string>>;
  logo: string;
  photo: ImageRef & { credit: string | null };
  gallery: ImageRef[];
  /** Number of print pages: base 2, premium 4. */
  pages: number;
}

/** Image info written by `npm run images` in public/img/<edition>/manifest.json, keyed by file name. */
export interface ImageInfo {
  width: number;
  height: number;
  /** Dominant colour, used as a placeholder while the photo loads. */
  color: string;
  /** Web versions: width -> URL. */
  web: Record<string, string>;
  /** 300 dpi JPG for print. */
  print: string | null;
  /** 1200×630 JPG for Open Graph (only main photos). */
  og: string | null;
  /** SVG logos are copied as they are. */
  svg?: string;
}

export interface Edition {
  edition: number;
  current: boolean;
  title: string;
  kicker: string;
  tagline: string;
  cover_photo: string;
  cover_photo_alt: string;
}
