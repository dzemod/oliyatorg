// Builds the site's logo files from the client's original logo.
//
// Usage: node tools/make_logo_assets.mjs [source.png]   (default: original-logo-200.png, the largest
//        version on oliyatorg.ua — there is no vector file)
//
// Output in site/assets/brand/:
//   logo.png          — the original, unchanged (copied as is)
//   logo-white.png    — white version for dark sections / video: coloured parts become white,
//                       white parts (band, petal outlines) become transparent, so the
//                       petal lines and the lettering stay readable on dark backgrounds
//   favicon-32.png, favicon-192.png, apple-touch-icon.png (180, on cream)
import fs from 'node:fs';
import sharp from 'sharp';

const src = process.argv[2] || 'original-logo-200.png';
const OUT = 'site/assets/brand';
fs.mkdirSync(OUT, { recursive: true });

fs.copyFileSync(src, `${OUT}/logo.png`);

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 4) {
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
  const whiteness = Math.min(r, g, b) / 255;          // 1 = white, 0 = saturated colour
  let alpha = a * Math.pow(1 - whiteness, 0.9);
  // the orange seed centre is drawn a little softer so it still reads as a separate disc
  if (r > 200 && g > 110 && g < 200 && b < 80) alpha *= 0.62;
  out[i] = out[i + 1] = out[i + 2] = 255;
  out[i + 3] = Math.round(alpha);
}
await sharp(out, { raw: info }).png().toFile(`${OUT}/logo-white.png`);

for (const [name, size, bg] of [['favicon-32.png', 32], ['favicon-192.png', 192], ['apple-touch-icon.png', 180, '#F3ECDF']]) {
  let img = sharp(src).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (bg) img = sharp(await sharp(src).resize(Math.round(size * .86), Math.round(size * .86)).toBuffer())
    .extend({ top: 13, bottom: 12, left: 13, right: 12, background: bg }).resize(size, size).flatten({ background: bg });
  await img.png().toFile(`${OUT}/${name}`);
}
console.log('Logo assets written to', OUT);
