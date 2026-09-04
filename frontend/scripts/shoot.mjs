import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const ORIGINAL = 'file:///mnt/c/Users/HP/OneDrive/Desktop/D-trips/Website/index.html';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

async function shoot(url, out, waitMs = 1500) {
  const page = await ctx.newPage();
  page.on('console', (m) => console.log(`[${out}] console:`, m.type(), m.text()));
  page.on('pageerror', (e) => console.log(`[${out}] pageerror:`, e.message));
  page.on('requestfailed', (r) => console.log(`[${out}] reqfail:`, r.url(), r.failure()?.errorText));
  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => {
    console.log(`[${out}] goto failed:`, e.message);
    return null;
  });
  console.log(`[${out}] status:`, resp?.status());
  await page.waitForTimeout(waitMs);
  // log any visual oddities
  const dims = await page.evaluate(() => ({
    docHeight: document.documentElement.scrollHeight,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyFont: getComputedStyle(document.body).fontFamily,
  }));
  console.log(`[${out}] dims:`, JSON.stringify(dims));
  await page.screenshot({ path: out, fullPage: false });
  await page.close();
  console.log(`[${out}] saved`);
}

await shoot(BASE, '/tmp/spa.png');
await shoot(ORIGINAL, '/tmp/original.png');

await browser.close();
console.log('done');
