/**
 * Form validation utilities shared between every form in the app.
 * Identical behaviour to the original HTMLs (checkout.html:1074,
 * build-trip-review.html:916).
 */
export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const minPhone = (v: string, len = 6) => v.trim().length >= len;
