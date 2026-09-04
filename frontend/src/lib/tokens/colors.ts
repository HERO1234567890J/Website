/**
 * Color tokens — single source of truth.
 * Mirrors :root in /Website/index.html:11-24, /Website/admin.html:11-28,
 * and the hard-coded literals used by the original prototype.
 */
export const colors = {
  paper: '#FFFFFF',
  sand: '#FFF8EE',
  sun: { DEFAULT: '#FFA61C', dark: '#e0900e' },
  ink: { DEFAULT: '#000000', soft: '#232323' },
  line: 'rgba(0,0,0,0.12)',
  // admin-only
  good: '#1E8E5A',
  warn: '#B5790A',
  bad: '#C43B3B',
  // hard-coded literals from the original HTMLs
  whatsapp: '#25D366',
  whatsappHover: '#1ebd5a',
  success: '#1f7a3f',
  error: '#c0392b',
} as const;

export type Colors = typeof colors;
