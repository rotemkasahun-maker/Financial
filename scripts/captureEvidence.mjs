import { chromium } from 'playwright';
import { mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = {};
for (let index = 0; index < process.argv.length - 1; index += 1) {
  const value = process.argv[index];
  if (value.startsWith('--')) args[value.slice(2)] = process.argv[index + 1];
}
if (!args.url || !args.output) {
  throw new Error('Usage: node scripts/captureEvidence.mjs --url URL --output PATH [--width 1440 --height 900 --selector SELECTOR]');
}
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: Number(args.width || 1440), height: Number(args.height || 900) } });
  await page.goto(args.url, { waitUntil: 'networkidle' });
  if (args.nav) {
    await page.locator(`[data-nav="${args.nav}"]`).first().evaluate(element => element.click());
    await page.waitForTimeout(500);
  }
  if (args.clickText) {
    await page.getByText(args.clickText, { exact: true }).first().evaluate(element => element.click());
    await page.waitForTimeout(400);
  }
  if (args.selector) await page.locator(args.selector).waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  const body = (await page.locator('body').innerText()).trim();
  if (!body || /404|cannot be reached|connection refused|error loading/i.test(body)) {
    throw new Error('Page appears blank or is an error page');
  }
  await mkdir(dirname(args.output), { recursive: true });
  await page.screenshot({ path: args.output, fullPage: false });
  const info = await stat(args.output);
  if (!info.size) throw new Error('Screenshot is empty');
  console.log(JSON.stringify({ output: args.output, bytes: info.size, title: await page.title() }));
} finally {
  await browser.close();
}
