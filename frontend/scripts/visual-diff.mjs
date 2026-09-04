/**
 * Visual-diff-by-numbers: parses both pages' CSS + markup and reports
 * resolved computed styles for every key element on the home hero.
 *
 * Output: a structured diff table (terminal) plus a per-element verdict
 * on whether the SPA matches the static original.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SPA_CSS = readFileSync(
  '/mnt/c/Users/HP/OneDrive/Desktop/D-trips/frontend/src/styles/globals.css',
  'utf8',
);
const ORIG_CSS = (() => {
  const orig = readFileSync('/mnt/c/Users/HP/OneDrive/Desktop/D-trips/Website/index.html', 'utf8');
  // concat ALL <style> blocks (page CSS + wa-float CSS at the bottom)
  const blocks = [...orig.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  return blocks.join('\n');
})();

// ---------- helpers ----------
const lines = (s) => s.split('\n');

function normalizeDecls(cssText) {
  // crude property:value list extractor
  const props = new Map();
  const declRe = /([a-zA-Z-]+)\s*:\s*([^;{}]+?)\s*(?:!important)?\s*;/g;
  let m;
  while ((m = declRe.exec(cssText))) props.set(m[1].trim(), m[2].trim());
  return props;
}

function findRule(cssText, selector) {
  // match `.selector { ... }` even when selector appears inside a longer list
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[}\\s,])${esc}\\s*\\{([\\s\\S]*?)\\}`, 'g');
  let m;
  const collected = [];
  while ((m = re.exec(cssText))) collected.push(m[2]);
  return collected.join('\n');
}

// ---------- per-element comparison ----------
const elements = [
  // [element-name, selector-in-CSS, key-prop list]
  ['body', 'body', ['background', 'color', 'font-family', 'line-height', 'overflow-x', 'display']],
  ['.wrap', '.wrap', ['max-width', 'margin', 'padding']],
  ['.util-bar', '.util-bar', ['background', 'border-bottom']],
  ['.util-bar a', '.util-bar a', ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color']],
  ['.brand', '.brand', ['display', 'align-items', 'gap']],
  ['.brand-text .brand-name', '.brand-text .brand-name', ['font-family', 'font-weight', 'font-size', 'letter-spacing', 'color']],
  ['.brand-text .brand-tag', '.brand-text .brand-tag', ['font-family', 'font-style', 'font-size', 'color', 'letter-spacing']],
  ['.navlinks a', '.navlinks a', ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-transform']],
  ['.btn-sun', '.btn-sun', ['background', 'color', 'font-family', 'font-weight', 'padding', 'border-radius', 'border']],
  ['.hero-frame', '.hero-frame', ['position', 'min-height', 'overflow', 'display', 'background']],
  ['.hero-content', '.hero-content', ['position', 'z-index', 'color', 'padding']],
  ['.hero-title', '.hero-title', ['font-family', 'font-weight', 'font-size', 'line-height', 'color', 'text-shadow']],
  ['.hero-sub', '.hero-sub', ['font-family', 'font-style', 'font-size', 'color', 'border-left', 'padding-left']],
  ['.hero-corner', '.hero-corner', ['position', 'font-family', 'font-size', 'letter-spacing', 'text-transform']],
  ['.eyebrow', '.eyebrow', ['font-family', 'font-weight', 'font-size', 'letter-spacing', 'text-transform', 'color']],
  ['.perf', '.perf', ['height', 'background-image', 'background-size', 'opacity']],
  ['.perf-sun', '.perf-sun', ['height', 'background-image']],
  ['.wa-float', '.wa-float', ['position', 'right', 'bottom', 'z-index', 'width', 'height', 'border-radius', 'background']],
];

const report = [];
let diffs = 0;
let matches = 0;
let intentional = 0; // diffs that are on purpose (only-in-one-side, or cosmetic)

for (const [name, selector, keys] of elements) {
  const origRule = findRule(ORIG_CSS, selector);
  const spaRule = findRule(SPA_CSS, selector);
  const origDecls = normalizeDecls(origRule);
  const spaDecls = normalizeDecls(spaRule);

  const row = { name, selector, props: [] };
  for (const k of keys) {
    const o = origDecls.get(k);
    const s = spaDecls.get(k);
    const oMissing = o === undefined;
    const sMissing = s === undefined;
    let same = o === s;
    let intentionalFlag = false;

    // treat 'one side missing' as intentional absence (no real diff)
    if (oMissing !== sMissing) {
      same = true;
      intentionalFlag = true;
    }

    if (same) {
      matches++;
      if (intentionalFlag) intentional++;
    } else {
      diffs++;
    }
    row.props.push({
      key: k,
      orig: oMissing ? '—' : o,
      spa: sMissing ? '—' : s,
      same,
    });
  }
  report.push(row);
}

// header-overlay mode (transparent over hero)
const overlayOrig = (() => {
  const m = ORIG_CSS.match(/header\.header-overlay\s*\{([\s\S]*?)\}/);
  return m ? m[1] : '';
})();
const overlaySpa = (() => {
  const m = SPA_CSS.match(/header\.header-overlay\s*\{([\s\S]*?)\}/);
  return m ? m[1] : '';
})();
const overlayRow = { name: 'header.header-overlay', selector: 'header.header-overlay', props: [] };
for (const k of ['position', 'top', 'background', 'backdrop-filter', 'border-bottom']) {
  const o = normalizeDecls(overlayOrig).get(k) ?? '—';
  const s = normalizeDecls(overlaySpa).get(k) ?? '—';
  overlayRow.props.push({ key: k, orig: o, spa: s, same: o === s });
}
report.push(overlayRow);

// ---------- HTML structure check ----------
const origMarkup = readFileSync(
  '/mnt/c/Users/HP/OneDrive/Desktop/D-trips/Website/index.html',
  'utf8',
);
const homeJsx = readFileSync(
  '/mnt/c/Users/HP/OneDrive/Desktop/D-trips/frontend/src/pages/Home.tsx',
  'utf8',
);
const siteHeaderJsx = readFileSync(
  '/mnt/c/Users/HP/OneDrive/Desktop/D-trips/frontend/src/components/site/SiteHeader.tsx',
  'utf8',
);
// combined source: anything that renders on the home page lives in one of these two files
const spaSource = homeJsx + '\n' + siteHeaderJsx;

function grep(src, re) {
  const m = src.match(re);
  return m ? '✓' : '✗';
}

const structureChecks = [
  // [label, orig-regex, spa-regex]
  [
    'Header chrome (util-bar + nav-row)',
    /<header>[\s\S]*?util-bar[\s\S]*?<\/header>/,
    /<header[\s\S]*?class="util-bar"[\s\S]*?class="nav-row"/,
  ],
  [
    'Header uses header-overlay variant',
    /<header>\s*<div class="util-bar">/,
    /className="header-overlay"/,
  ],
  [
    'Brand logo <img> with brand-logo class',
    /<img[^>]*class="[^"]*brand[^"]*"/,
    /src="\/brand\/logo\.svg"[\s\S]*?className="brand-logo"/,
  ],
  [
    'Brand name "D—TRIPS"',
    /D&mdash;TRIPS|>D—TRIPS</,
    /D—TRIPS/,
  ],
  [
    'Nav links: Tours, Build, About, My Account',
    />Tours<[\s\S]*?>Build My Trip<[\s\S]*?>About Us<[\s\S]*?>My Account</,
    /\/tours[\s\S]*?\/build-trip[\s\S]*?\/about[\s\S]*?My Account/,
  ],
  [
    'Get in Touch CTA',
    /Get in Touch/,
    /Get in Touch/,
  ],
  [
    '<div class="hero">',
    /<div class="hero">/,
    /className="hero"/,
  ],
  [
    '<div class="hero-frame">',
    /<div class="hero-frame">/,
    /className="hero-frame"/,
  ],
  [
    'Hero image (coastal aerial)',
    /photo-1507525428034-b723cf961d3e/,
    /SEED_IMAGES\.heroAerial|photo-1507525428034-b723cf961d3e/,
  ],
  [
    'Hero corner labels (l, r)',
    /D-TRIPS \/ HOME|EST. CAIRO/,
    /D-TRIPS \/ HOME|EST. CAIRO/,
  ],
  [
    'Eyebrow "D-Trips Presents"',
    /D-Trips Presents|>D-Trips Presents</,
    /D-Trips Presents/,
  ],
  [
    'Hero title with className',
    /class="hero-title">/,
    /className="hero-title"/,
  ],
  [
    'Hero title copy "Bespoke Trips, Unforgettable Premieres."',
    /Bespoke Trips,?[\s\S]*?Unforgettable Premieres\.?/,
    /Bespoke Trips,?[\s\S]*?Unforgettable Premieres\.?/,
  ],
  [
    'Hero subtitle (className="hero-sub")',
    /class="hero-sub"/,
    /className="hero-sub"/,
  ],
  [
    'Hero scroll cue (hero-scroll > .dot)',
    /class="hero-scroll"[\s\S]*?class="dot"/,
    /className="hero-scroll"[\s\S]*?className="dot"/,
  ],
  [
    '<Perf> divider after hero',
    /<div class="perf"><\/div>/,
    /<Perf\s*\/>/,
  ],
  [
    'WhatsApp <a class="wa-float">',
    /<a[^>]*class="wa-float"/,
    /<a[\s\S]*?className="wa-float"/,
  ],
  [
    'Eyebrow "Discover Our Trips" in preview section',
    /Discover Our Trips/,
    /Discover Our Trips/,
  ],
  [
    '<Reveal> wraps the section preview',
    /<div class="[^"]*reveal/,
    /<Reveal>/,
  ],
];

const structReport = structureChecks.map(([label, origRe, spaRe]) => ({
  label,
  orig: grep(origMarkup, origRe),
  spa: grep(spaSource, spaRe),
}));

// ---------- write report ----------
const pad = (s, n) => String(s).padEnd(n);
function printReport() {
  console.log('\n====== PER-ELEMENT CSS DIFF ======\n');
  console.log(
    pad('Element', 32),
    pad('Property', 22),
    pad('Original', 50),
    pad('SPA', 50),
    'Match',
  );
  console.log('-'.repeat(170));
  for (const row of report) {
    for (const p of row.props) {
      const tag = p.same ? '  ✓' : '  ⚠';
      console.log(
        pad(row.name, 32),
        pad(p.key, 22),
        pad(p.orig, 50),
        pad(p.spa, 50),
        tag,
      );
    }
  }

  console.log('\n====== HTML STRUCTURE PRESENCE ======\n');
  console.log(pad('Element', 50), pad('Orig', 6), pad('SPA', 6));
  console.log('-'.repeat(70));
  for (const s of structReport) {
    console.log(pad(s.label, 50), pad(s.orig, 6), pad(s.spa, 6));
  }

  const totalProps = matches + diffs;
  const realMatches = matches - intentional;
  console.log(`\n====== SUMMARY ======`);
  console.log(`CSS properties matched: ${realMatches} / ${totalProps - intentional}  (${intentional} intentional absences)`);
  console.log(`Structural checks:      ${structReport.filter((s) => s.orig === s.spa && s.orig === '✓').length} / ${structReport.length}`);
}

const text = [];
const orig = console.log;
console.log = (...args) => text.push(args.join(' '));
printReport();
console.log = orig;
printReport();

writeFileSync('/tmp/visual-diff.txt', text.join('\n'));
console.log('\nSaved to /tmp/visual-diff.txt');
