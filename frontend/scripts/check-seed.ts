/**
 * Build-time guard: ensure seed images don't leak into production routes
 * after §2.4 swap. Run via `pnpm seed:check` (add `--prod` for CI gate).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SEED_HOST = 'images.unsplash.com';
const SEED_FILE = join(process.cwd(), 'src', 'lib', 'seed-images.ts');
const srcRoot = join(process.cwd(), 'src');
const isProd = process.argv.includes('--prod');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    if (/\.(ts|tsx|js|jsx)$/.test(entry)) return [full];
    return [];
  });
}

let leaks = 0;
for (const file of walk(srcRoot)) {
  if (file === SEED_FILE) continue; // the registry itself is allowed
  const content = readFileSync(file, 'utf8');
  if (content.includes(SEED_HOST)) {
    console.warn(`[seed-check] ${SEED_HOST} found in ${file}`);
    if (isProd) leaks++;
  }
}

if (leaks > 0) {
  console.error(
    `\n[seed-check] FAIL: ${leaks} file(s) still reference seed host. ` +
      `Run §2.4 swap (Bunny Storage) before launch.\n`,
  );
  process.exit(1);
} else {
  console.log(
    `[seed-check] OK — no seed-image URLs found.` +
      (isProd ? '' : ' (use --prod to enforce)'),
  );
}
