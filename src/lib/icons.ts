import type { Social } from '../types';

/** Social icons, drawn inline (no icon font to download). 24×24, currentColor. */
export const SOCIAL_ICONS: Record<Social, string> = {
  facebook:
    '<path fill="currentColor" d="M13.5 21v-7.5H16l.4-3H13.5V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z"/>',
  instagram:
    '<rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16.8" cy="7.2" r="1.1" fill="currentColor"/>',
  linkedin:
    '<path fill="currentColor" d="M5 9.5h3V19H5zM6.5 5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM10 9.5h2.9v1.3c.4-.8 1.4-1.5 2.9-1.5 3 0 3.6 2 3.6 4.6V19h-3v-4.5c0-1.1 0-2.5-1.5-2.5S13 13.2 13 14.4V19h-3z"/>',
  youtube:
    '<rect x="3" y="6" width="18" height="12" rx="3.5" fill="currentColor"/><path d="M10.2 9.3v5.4l4.6-2.7z" fill="var(--paper)"/>',
  whatsapp:
    '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M5.2 18.8l1-3.4A7.6 7.6 0 1 1 9 18z"/><path fill="currentColor" d="M9.6 8.4c.2-.3.5-.3.7-.3h.4c.2 0 .3.1.4.3l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.1-.1.3 0 .4.5.9 1.2 1.6 2.1 2.1.1.1.3.1.4 0l.5-.6c.1-.1.3-.2.5-.1l1.4.6c.2.1.3.3.3.4v.4c0 .3-.1.6-.4.8-.5.4-1.3.6-2.2.3-2.1-.7-3.7-2.3-4.4-4.4-.3-.9-.1-1.7.3-2.2z"/>',
};

export const SOCIAL_LABEL: Record<Social, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
};
