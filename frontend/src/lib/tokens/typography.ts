/**
 * Typography tokens — mirrors var(--script/cine/body/eyebrow/brand-font)
 * and the scale of heading sizes used across /Website/*.html.
 */
export const fontFamily = {
  script: ['Yellowtail', 'cursive'],
  cine: ['Fraunces', 'serif'],
  body: ['Inter', 'sans-serif'],
  eyebrow: ['Poppins', 'sans-serif'],
  brand: ['LemonadoScript', 'ShinanoItalic', 'Yellowtail', 'cursive'],
} as const;

/** Tailwind clamp() values lifted verbatim from the original HTML. */
export const fontSize = {
  heroTitle: 'clamp(44px, 7vw, 96px)',
  sectionTitle: 'clamp(28px, 3.6vw, 42px)',
  pageHero: 'clamp(42px, 6vw, 74px)',
  footerTitle: 'clamp(34px, 4.5vw, 52px)',
  body: '15px',
  bodySmall: '14.5px',
  eyebrow: '11px',
} as const;

export const letterSpacing = {
  eyebrow: '0.08em',
  eyebrowWide: '0.28em',
} as const;
