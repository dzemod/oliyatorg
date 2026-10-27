// node screenshot.mjs [url] [label]
// Full-page PNG at 1440×900 (networkidle0, 30 s) → ./temporary screenshots/screenshot-N[-label].png (never overwrites).
// Optional env: VW / VH (viewport), SCROLL (px of page scroll before the shot), FULL=0 (viewport only — the horizontal
// desktop page is one screen tall, so use SCROLL + FULL=0 to capture a given section there), SEL (a section's CSS
// selector, e.g. SEL=#production: scrolls to it instead of SCROLL, on both the horizontal and the vertical page),
// CLICK (a selector clicked after load, before scrolling — e.g. the EN button), WAIT (extra ms before the shot),
// HOVER (a selector hovered right before the shot).
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
if (process.env.CLICK) {   // e.g. CLICK='.nav [data-lang="en"]' for the English page
  await page.evaluate(sel => document.querySelector(sel).click(), process.env.CLICK);
  await new Promise(r => setTimeout(r, 800));
}
if (process.env.SEL) {
  // scroll to a section (CSS selector): the horizontal page scrolls by the panel's x on the track (one px of scroll =
  // one px of track), the vertical page to its top under the header
  await page.evaluate(sel => {
    const el = document.querySelector(sel);
    const h = document.documentElement.classList.contains('is-h') && !document.documentElement.classList.contains('is-v');
    scrollTo(0, h ? el.offsetLeft : el.getBoundingClientRect().top + scrollY - document.getElementById('header').offsetHeight);
  }, process.env.SEL);
  await new Promise(r => setTimeout(r, 2500));
} else if (process.env.SCROLL) {
  await page.evaluate(y => scrollTo(0, y), +process.env.SCROLL);
  await new Promise(r => setTimeout(r, 2500));   // the scrub (1 s) and the section fades settle
}
if (process.env.WAIT) await new Promise(r => setTimeout(r, +process.env.WAIT));   // extra ms, e.g. for a long animation
if (process.env.HOVER) { await page.hover(process.env.HOVER); await new Promise(r => setTimeout(r, 500)); }
await page.screenshot({ path: file, fullPage: process.env.FULL !== '0' });
await browser.close();
console.log(file);
