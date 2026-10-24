// Optimizes source media from images/ into site/assets/img/ for the web.
//
// Usage:  node tools/optimize_media.mjs            (skip files that are already built)
//         node tools/optimize_media.mjs --force    (rebuild everything)
//
// Photos  images/<name>.jpg  ->  site/assets/img/<name>-{800,1400,2400}.{webp,jpg}
//         (portrait photos: 700/1200/1800). Double extensions like .jpg.jpg are handled.
// Cards   product photos listed in CARDS -> site/assets/img/<name>-card-{800,1400,2000}.{webp,jpg} (2:1)
// Video   images/hero-video.mp4 -> site/assets/img/hero-1920.mp4 (< 4 MB) and hero-960.mp4 (light)
// Poster  images/hero-poster.jpg if present, otherwise a frame from the video
//         -> site/assets/img/hero-poster-{960,1920}.{webp,jpg}
//
// Needs: npm install (sharp, ffmpeg-static).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

const SRC = 'images';
const OUT = 'site/assets/img';
const force = process.argv.includes('--force');
fs.mkdirSync(OUT, { recursive: true });

const baseName = f => f.replace(/(\.(jpe?g|png|mp4|webp))+$/i, '').toLowerCase();
const fresh = p => !force && fs.existsSync(p);
const kb = p => Math.round(fs.statSync(p).size / 1024) + ' KB';

async function photo(file, name) {
  const src = path.join(SRC, file);
  const { width, height } = await sharp(src).metadata();
  const widths = height > width ? [700, 1200, 1800] : [800, 1400, 2400];
  for (const w of widths) {
    const size = Math.min(w, width);
    const jpg = path.join(OUT, `${name}-${w}.jpg`);
    const webp = path.join(OUT, `${name}-${w}.webp`);
    if (fresh(jpg) && fresh(webp)) continue;
    const img = sharp(src).rotate().resize({ width: size, withoutEnlargement: true });
    await img.clone().jpeg({ quality: 78, progressive: true, mozjpeg: true }).toFile(jpg);
    await img.clone().webp({ quality: 74 }).toFile(webp);
    console.log(`${name}-${w}: jpg ${kb(jpg)}, webp ${kb(webp)}`);
  }
}

// 2:1 card crops for the home page product cards. The card box takes the height left on the screen, so it runs
// from about 1:1 (tall screens) to 2:1 (short laptops); the page crops the centre with object-fit: cover, and the
// product stays whole at any of those proportions (a 4:3 box shows exactly the band below).
// The sources are portrait and the product (cork to seeds) is taller than a plain crop allows, so the
// crop takes the product band [top, bottom] (fractions of the source height) and, when that band is too tall
// for the width, widens the plain studio backdrop by repeating its edge columns ('copy' — 'mirror' doubles shadows).
const RATIO = 2;
const CARDS = {
  'product-oil-unrefined': [.1667, .932],
  'product-oil-refined': [.1667, .932],
  'product-meal': [.24, .98],    // taller band: the bowl + pellets are wide and must fit a ~1:1 box
};

async function card(file, name) {
  const [t, b] = CARDS[name];
  const src = path.join(SRC, file);
  const { width: W, height: H } = await sharp(src).metadata();
  const top = Math.round(t * H);
  const h = Math.max(Math.round(b * H) - top, Math.round(W / RATIO));
  const side = Math.max(0, Math.round(h * RATIO) - W);
  for (const w of [800, 1400, 2000]) {
    const jpg = path.join(OUT, `${name}-card-${w}.jpg`);
    const webp = path.join(OUT, `${name}-card-${w}.webp`);
    if (fresh(jpg) && fresh(webp)) continue;
    const buf = await sharp(src).rotate()
      .extract({ left: 0, top, width: W, height: Math.min(h, H - top) })
      .extend({ left: Math.floor(side / 2), right: Math.ceil(side / 2), extendWith: 'copy' })
      .toBuffer();
    const img = sharp(buf).resize({ width: w, height: Math.round(w / RATIO), fit: 'cover' });
    await img.clone().jpeg({ quality: 78, progressive: true, mozjpeg: true }).toFile(jpg);
    await img.clone().webp({ quality: 74 }).toFile(webp);
    console.log(`${name}-card-${w}: jpg ${kb(jpg)}, webp ${kb(webp)}`);
  }
}

function video(file) {
  const src = path.join(SRC, file);
  const jobs = [
    // [output, width, maxrate] — 11 s at ~2.4 Mbit/s stays well under 4 MB
    [path.join(OUT, 'hero-1920.mp4'), 1920, '2400k'],
    [path.join(OUT, 'hero-960.mp4'), 960, '900k'],
  ];
  for (const [out, w, rate] of jobs) {
    if (fresh(out)) continue;
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src,
      '-an', '-vf', `scale=${w}:-2`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
      '-maxrate', rate, '-bufsize', String(parseInt(rate) * 2) + 'k',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    console.log(`${path.basename(out)}: ${kb(out)}`);
  }
}

async function poster(videoFile) {
  const own = fs.readdirSync(SRC).find(f => baseName(f) === 'hero-poster');
  let src = own && path.join(SRC, own);
  if (!src) {
    fs.mkdirSync('.tmp', { recursive: true });
    src = '.tmp/hero-poster-frame.png';
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.4',
      '-i', path.join(SRC, videoFile), '-frames:v', '1', src]);
    console.log('hero-poster: no images/hero-poster.jpg, using a frame from the video');
  }
  for (const w of [960, 1920]) {
    const jpg = path.join(OUT, `hero-poster-${w}.jpg`);
    const webp = path.join(OUT, `hero-poster-${w}.webp`);
    if (fresh(jpg) && fresh(webp)) continue;
    const img = sharp(src).resize({ width: w, withoutEnlargement: true });
    await img.clone().jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(jpg);
    await img.clone().webp({ quality: 76 }).toFile(webp);
  }
}

const files = fs.readdirSync(SRC);
for (const f of files) {
  const name = baseName(f);
  if (/\.(jpe?g|png)$/i.test(f) && name !== 'hero-poster') await photo(f, name);
  if (/\.(jpe?g|png)$/i.test(f) && CARDS[name]) await card(f, name);
}
const vid = files.find(f => /\.mp4$/i.test(f) && baseName(f).startsWith('hero'));
if (vid) { video(vid); await poster(vid); } else console.log('No hero video found in images/');
console.log('Done.');
