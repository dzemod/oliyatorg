// Renders certificate PDFs for the site: the first page as WebP (≈600px thumbnail + ≈1600px large) and the PDF itself
// for download, into site/assets/certificates/. Rendering runs pdf.js inside headless Chrome (no native tools needed).
//
// Usage:
//   node tools/render_certificates.mjs --text <dir>      print the first page's text of every PDF in <dir> (to name them)
//   node tools/render_certificates.mjs <dir> <map.json>  render; map.json = { "<source file name>": "<clean-name>", … }
//
// Output per certificate: <name>-600.webp, <name>-1600.webp, <name>.pdf
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const OUT = 'site/assets/certificates';
const args = process.argv.slice(2);
const textOnly = args[0] === '--text';
const dir = textOnly ? args[1] : args[0];
const map = textOnly ? null : JSON.parse(fs.readFileSync(args[1], 'utf8'));
const files = textOnly ? fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf')) : Object.keys(map);

const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 180000 });
const page = await browser.newPage();
// a fake origin: pdf.js from node_modules, the PDFs from <dir>
await page.setRequestInterception(true);
page.on('request', req => {
  const u = new URL(req.url());
  if (u.hostname !== 'local') return req.continue();
  const p = decodeURIComponent(u.pathname);
  if (p === '/') return req.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' });
  const file = p.startsWith('/pdfjs/') ? path.resolve('node_modules/pdfjs-dist/build', p.slice(7)) : path.resolve(dir, p.slice(5));
  if (!fs.existsSync(file)) return req.respond({ status: 404, body: '' });
  req.respond({ status: 200, contentType: file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.pdf') ? 'application/pdf' : 'text/html', body: fs.readFileSync(file) });
});
await page.goto('http://local/');
await page.addScriptTag({ type: 'module', content: `
  import * as pdfjs from 'http://local/pdfjs/pdf.min.mjs';
  pdfjs.GlobalWorkerOptions.workerSrc = 'http://local/pdfjs/pdf.worker.min.mjs';
  window.firstPage = async (name, width) => {
    const doc = await pdfjs.getDocument('http://local/pdf/' + encodeURIComponent(name)).promise;
    const pg = await doc.getPage(1);
    const text = (await pg.getTextContent()).items.map(i => i.str).join(' ').replace(/\\s+/g, ' ').trim();
    if (!width) return { text, pages: doc.numPages };
    const base = pg.getViewport({ scale: 1 });
    const vp = pg.getViewport({ scale: width / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pg.render({ canvasContext: ctx, viewport: vp }).promise;
    return { text, pages: doc.numPages, png: canvas.toDataURL('image/png') };
  };
  window.ready = true;` });
await page.waitForFunction('window.ready');

fs.mkdirSync(OUT, { recursive: true });
for (const f of files) {
  if (textOnly) {
    const { text, pages } = await page.evaluate((n) => window.firstPage(n, 0), f);
    console.log(`\n=== ${f} (${pages} pages)\n${text.slice(0, +(process.env.CHARS || 1500))}`);
    continue;
  }
  const name = map[f];
  for (const w of [600, 1600]) {
    // rendered at twice the size, then downscaled: sharper text
    const { png } = await page.evaluate((n, w) => window.firstPage(n, w), f, w * 2);
    await sharp(Buffer.from(png.split(',')[1], 'base64')).resize({ width: w }).webp({ quality: w > 1000 ? 82 : 78 }).toFile(`${OUT}/${name}-${w}.webp`);
  }
  fs.copyFileSync(path.join(dir, f), `${OUT}/${name}.pdf`);
  console.log(f, '→', name);
}
await browser.close();
