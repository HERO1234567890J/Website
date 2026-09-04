# Commercial Asset Dependencies

The following are **not** open-licensed and must be supplied by D-Trips
before public launch. Until provided, the site falls back gracefully
to free alternatives (Google Fonts: Yellowtail, system cursive).

| Asset | Repo path | Status | License required |
|---|---|---|---|
| Lemonado Script Smooth Italic | `/fonts/Lemonado-ScriptSmoothItalic.woff2` + `.otf` | MISSING | Commercial |
| Shinano Italic | `/fonts/Shinano-Italic.woff2` + `.otf` | MISSING | Commercial |

## Activation

Drop the licensed files into `/fonts/`. No code change is required —
the `@font-face` declarations in `src/styles/globals.css` already
reference these filenames and the fallback chain (Yellowtail → system
cursive) is identical to the static HTML originals at
`/Website/index.html:30-40`.

## D-Trips brand assets that should also be supplied (later)

- Real photography (currently seed content from Unsplash, marked via
  `src/lib/seed-images.ts` — see §2.4 of the original spec for the
  Bunny Storage swap before launch).
- Founder portrait (currently base64-inlined in `/Website/about.html`).
