// Builds the site's logo files from the client's original logo — resized only: no redrawing, recolouring or effects.
//
// Usage: node tools/make_logo_assets.mjs [source.png]   (default: brand_assets/original-logo-200.png, the largest
//        version the client has — there is no vector file yet)
//
// Output in site/assets/brand/:
//   logo-64 / logo-128    .png + .webp — header (64px tall, 1x / 2x; phones show it at 48px)
//   logo-80 / logo-160    .png + .webp — footer (80px tall, 1x / 2x)
//   favicon-32.png, apple-touch-icon.png (180, on stone), icon-512.png (web manifest, on stone)
//   og-image.jpg (1200×630 link preview)
import fs from 'node:fs';
import sharp from 'sharp';

const src = process.argv[2] || 'brand_assets/original-logo-200.png';
const OUT = 'site/assets/brand';
const STONE = '#EFECE6';
fs.mkdirSync(OUT, { recursive: true });

const resize = size => sharp(src).resize(size, size, { fit: 'contain', kernel: 'lanczos3', background: { r: 0, g: 0, b: 0, alpha: 0 } });
for (const size of [64, 128, 80, 160]) {
  await resize(size).png({ compressionLevel: 9 }).toFile(`${OUT}/logo-${size}.png`);
  await resize(size).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/logo-${size}.webp`);
}

// The whole logo stays readable as a sunflower at 32px (the wordmark band runs across the flower, so no crop
// isolates "only the symbol" without cutting the lettering).
await resize(32).png().toFile(`${OUT}/favicon-32.png`);
// opaque icons: the logo on the site's stone background with a small margin
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-512.png', 512]]) {
  const inner = Math.round(size * .88), pad = size - inner;
  await sharp(await resize(inner).png().toBuffer())
    .extend({ top: Math.floor(pad / 2), bottom: Math.ceil(pad / 2), left: Math.floor(pad / 2), right: Math.ceil(pad / 2), background: STONE })
    .flatten({ background: STONE }).png().toFile(`${OUT}/${name}`);
}
// link preview (1200×630): the hero photo, the logo at its native 200px on a stone square in the middle
const card = 248;
const logoCard = await sharp({ create: { width: card, height: card, channels: 4, background: STONE } })
  .composite([{ input: src, gravity: 'centre' }]).png().toBuffer();
await sharp('site/assets/img/hero-poster-1920.jpg').resize(1200, 630, { fit: 'cover' })
  .composite([{ input: logoCard, gravity: 'centre' }]).jpeg({ quality: 86, mozjpeg: true }).toFile(`${OUT}/og-image.jpg`);
console.log('Logo assets written to', OUT);
