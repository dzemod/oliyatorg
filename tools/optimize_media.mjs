// Optimizes source media from images/ into site/assets/img/ for the web.
//
// Usage:  node tools/optimize_media.mjs            (skip files that are already built)
//         node tools/optimize_media.mjs --force    (rebuild everything)
//
// Photos  images/<name>.jpg  ->  site/assets/img/<name>-{800,1400,2400}.{webp,jpg}
//         (portrait photos: 700/1200/1800). Double extensions like .jpg.jpg are handled.
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
}
const vid = files.find(f => /\.mp4$/i.test(f) && baseName(f).startsWith('hero'));
if (vid) { video(vid); await poster(vid); } else console.log('No hero video found in images/');
console.log('Done.');
