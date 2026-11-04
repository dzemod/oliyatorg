// Removes the white outline (sticker stroke) around the sunflower in the client's logo; everything else stays as is:
// the petals, the thin white lines between them, the white band with the green rules and the "ОЛІЯТОРГ" lettering, ™.
//
// Usage: node tools/remove_logo_outline.mjs [source.png] [out.png]
//        (default: brand_assets/original-logo-200.png → brand_assets/logo-no-outline-200.png; the original is kept)
//
// How: 1) flood fill from the transparent outside through whitish pixels (light, low saturation) — that is exactly
//         the outer stroke; the band (between its two green rules) is protected, so its white field is never reached;
//      2) the pixels on the stroke's inner edge are yellow blended with white: "colour to alpha" un-blends them
//         (white is taken out, the remaining colour keeps its own opacity), so the petals get a smooth edge, no halo.
import sharp from 'sharp';

const src = process.argv[2] || 'brand_assets/original-logo-200.png';
const out = process.argv[3] || 'brand_assets/logo-no-outline-200.png';

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const at = (x, y) => (y * W + x) * 4;

// the band: the two green rules crossing the middle column, and the band's horizontal extent on its middle row
const isGreen = i => data[i + 3] > 128 && data[i + 1] > data[i] + 30 && data[i + 1] > data[i + 2];
const cx = W >> 1;
let top = -1, bottom = -1;
for (let y = Math.round(H * .3); y < Math.round(H * .7); y++) if (isGreen(at(cx, y)) && !isGreen(at(cx, y - 1)) && top < 0) top = y;
for (let y = Math.round(H * .7); y > Math.round(H * .3); y--) if (isGreen(at(cx, y)) && !isGreen(at(cx, y + 1)) && bottom < 0) bottom = y;
if (top < 0 || bottom <= top) throw new Error('band rules not found');
const midY = (top + bottom) >> 1;
let left = 0, right = W - 1;
while (left < W && data[at(left, midY) + 3] < 128) left++;
while (right > 0 && data[at(right, midY) + 3] < 128) right--;
// rules included; one column either side keeps the band ends' anti-aliasing
const inBand = (x, y) => y >= top && y <= bottom && x >= left - 1 && x <= right + 1;
console.log(`band: y ${top}–${bottom}, x ${left}–${right}`);

// whiteness of a pixel: 1 = pure white, 0 = saturated colour (the petals' yellow has blue ≈ 0)
const whiteness = i => Math.min(data[i], data[i + 1], data[i + 2]) / 255;

// 1) flood fill from the outside
const outside = new Uint8Array(N);
const queue = [];
for (let p = 0; p < N; p++) if (data[p * 4 + 3] < 24) { outside[p] = 1; queue.push(p); }
while (queue.length) {
  const p = queue.pop(), x = p % W, y = (p / W) | 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const q = ny * W + nx;
    if (outside[q] || inBand(nx, ny)) continue;
    if (whiteness(q * 4) > .78) { outside[q] = 1; queue.push(q); }
  }
}
for (let p = 0; p < N; p++) if (outside[p]) data[p * 4 + 3] = 0;

// 2) colour to alpha on the edge: pixels touching the cleared area (two-pixel ring), outside the band
const touches = (x, y, r) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H && outside[ny * W + nx]) return true;
  }
  return false;
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x, i = p * 4;
  if (outside[p] || inBand(x, y) || data[i + 3] === 0 || !touches(x, y, 2)) continue;
  // pixel = a·colour + (1 − a)·white  →  a from the channel furthest from white
  const m = Math.min(data[i], data[i + 1], data[i + 2]);
  const a = 1 - m / 255;
  if (a < .04) { data[i + 3] = 0; continue; }
  for (let c = 0; c < 3; c++) data[i + c] = Math.round(Math.max(0, Math.min(255, (data[i + c] - 255 * (1 - a)) / a)));
  data[i + 3] = Math.round(data[i + 3] * a);
}

await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(out);
console.log('written', out);
