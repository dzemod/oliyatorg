// node screenshot.mjs [url] [label]
// Full-page PNG at 1440×900 (networkidle0, 30 s) → ./temporary screenshots/screenshot-N[-label].png (never overwrites).
// Optional env: VW / VH (viewport), SCROLL (px of page scroll before the shot), FULL=0 (viewport only — the horizontal
// desktop page is one screen tall, so use SCROLL + FULL=0 to capture a given section there).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? '-' + process.argv[3] : '';
const dir = path.resolve('temporary screenshots');
fs.mkdirSync(dir, { recursive: true });
let n = 1;
while (fs.readdirSync(dir).some(f => f.startsWith(`screenshot-${n}.`) || f.startsWith(`screenshot-${n}-`))) n++;
const file = path.join(dir, `screenshot-${n}${label}.png`);

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(p => fs.existsSync(p));

const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
const vw = +process.env.VW || 1440, vh = +process.env.VH || 900;
await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
if (process.env.SCROLL) {
  await page.evaluate(y => scrollTo(0, y), +process.env.SCROLL);
  await new Promise(r => setTimeout(r, 2500));   // the scrub (1 s) and the section fades settle
}
await page.screenshot({ path: file, fullPage: process.env.FULL !== '0' });
await browser.close();
console.log(file);
