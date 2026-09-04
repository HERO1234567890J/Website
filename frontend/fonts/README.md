# /fonts/

This directory is intentionally empty in the repo.

The brand script font (`LemonadoScript`) and italic variant
(`ShinanoItalic`) referenced in `tailwind.config.ts > fontFamily.brand`
and in `src/styles/globals.css > @font-face` are **commercial assets**
that must be licensed and supplied by D-Trips directly.

Until then, the CSS fallback chain resolves to Google Fonts'
`Yellowtail` (free) and then to the system cursive stack.

To activate the licensed fonts:

1. Drop `Lemonado-ScriptSmoothItalic.woff2` + `.otf` here.
2. Drop `Shinano-Italic.woff2` + `.otf` here.
3. No code change required — the `@font-face` declarations in
   `src/styles/globals.css` already point at these filenames.

See also: `/COMMERCIAL_ASSETS.md` (repo root) and `Stage 0.5` in the
Phase 1 implementation plan.
