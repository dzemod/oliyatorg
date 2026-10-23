// Builds the 4 logo options for Oliyatorg as clean SVGs (text converted to outlines, so the files
// look the same everywhere — no font needed to view them).
//
// Usage: node tools/build_logo_options.mjs
// Output: site/assets/brand/options/logo-0N.svg and logo-0N-white.svg (N = 1…4)
//
// Concept kept from the original: sunflower crown + seed disc + a horizontal band
// carrying the name across the flower. Colours: graphite + the site's gold.
// Needs: npm install (opentype.js, @fontsource/cormorant-garamond, @fontsource/manrope).
import fs from 'node:fs';
import opentype from 'opentype.js';

const OUT = 'site/assets/brand/options';
fs.mkdirSync(OUT, { recursive: true });

const PALETTE = {
  color: { ink: '#221F1A', gold: '#C08A2D', disc: '#221F1A' },
  white: { ink: '#FFFFFF', gold: '#E7BC63', disc: 'none' }
};

/* ---------- fonts → outlined text ---------- */
const fontFiles = (family, weight) => ['cyrillic', 'latin'].map(sub =>
  { const b = fs.readFileSync(`node_modules/@fontsource/${family}/files/${family}-${sub}-${weight}-normal.woff`);
    return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); });
const cache = {};
const font = (family, weight) => (cache[family + weight] ??= fontFiles(family, weight));

/** Returns { d, width } for a string set at (x, baseline). tracking in em. anchor: start|middle|end */
function text(str, { family, weight, size, tracking = 0, x = 0, y = 0, anchor = 'start' }) {
  const fonts = font(family, weight);
  const glyphs = [...str].map(ch => {
    for (const f of fonts) { const g = f.charToGlyph(ch); if (g && g.index !== 0) return { f, g }; }
    return { f: fonts[0], g: null, space: true };
  });
  const adv = ({ f, g }) => (g ? g.advanceWidth : f.unitsPerEm * 0.26) * size / f.unitsPerEm;
  const width = glyphs.reduce((w, gl, i) => w + adv(gl) + (i < glyphs.length - 1 ? tracking * size : 0), 0);
  let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  let d = '';
  for (const gl of glyphs) {
    if (gl.g) d += gl.g.getPath(cx, y, size).toPathData(2);
    cx += adv(gl) + tracking * size;
  }
  return { d, width };
}

/** Text along a circle. side 'top' reads clockwise above the centre (glyphs grow outward from r),
    'bottom' reads left→right below the centre (glyphs grow inward from r). */
function arcText(str, { family, weight, size, tracking = 0 }, cx, cy, r, side = 'top') {
  const fonts = font(family, weight);
  const items = [...str].map(ch => {
    for (const f of fonts) { const g = f.charToGlyph(ch); if (g && g.index !== 0) return { f, g }; }
    return { f: fonts[0], g: null };
  }).map(({ f, g }) => ({ g, adv: (g ? g.advanceWidth : f.unitsPerEm * 0.26) * size / f.unitsPerEm + tracking * size }));
  const total = items.reduce((s, it) => s + it.adv, 0) - tracking * size;
  const span = total / r;
  let cum = 0, out = '';
  for (const { g, adv } of items) {
    const mid = (cum + (adv - tracking * size) / 2) / r;
    cum += adv;
    if (!g) continue;
    const w = adv - tracking * size;
    const d = g.getPath(-w / 2, 0, size).toPathData(2);
    const deg = side === 'top' ? (-span / 2 + mid) * 180 / Math.PI : (span / 2 - mid) * 180 / Math.PI;
    out += side === 'top'
      ? `<path transform="translate(${cx} ${cy}) rotate(${f2(deg)}) translate(0 ${-r})" d="${d}"/>`
      : `<path transform="translate(${cx} ${cy}) rotate(${f2(deg)}) translate(0 ${r})" d="${d}"/>`;
  }
  return out;
}

/* ---------- sunflower geometry ---------- */
const f2 = n => +n.toFixed(2);
function petal(cx, cy, r0, len, w) {
  const b = cy - r0, t = cy - r0 - len;
  return `M${f2(cx)} ${f2(b)}C${f2(cx + w)} ${f2(b - len * .3)} ${f2(cx + w * .72)} ${f2(b - len * .76)} ${f2(cx)} ${f2(t)}` +
         `C${f2(cx - w * .72)} ${f2(b - len * .76)} ${f2(cx - w)} ${f2(b - len * .3)} ${f2(cx)} ${f2(b)}Z`;
}
const ring = (n, offset, fn) => Array.from({ length: n }, (_, i) => fn(offset + i * 360 / n)).join('');
const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f2(w)} ${f2(h)}" width="${Math.round(w)}" height="${Math.round(h)}" role="img" aria-label="${title}">\n${body}\n</svg>\n`;

/* ---------- 01 · closest to the original ---------- */
function logo01(c) {
  const W = 400, H = 340, cx = 200, cy = 170, bandH = 64;
  const back = ring(16, 11.25, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 34, 128, 27)}"/>`);
  const front = ring(16, 0, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 34, 106, 24)}"/>`);
  const word = text('ОЛІЯТОРГ', { family: 'manrope', weight: 800, size: 47, tracking: .03, x: cx, y: cy + 17, anchor: 'middle' });
  const tm = text('ТМ', { family: 'manrope', weight: 700, size: 12, tracking: .04, x: 386, y: cy - bandH / 2 - 7, anchor: 'end' });
  return svg(W, H, `<defs><mask id="o1">
  <rect width="${W}" height="${H}" fill="#fff"/>
  <g fill="none" stroke="#000" stroke-width="3.2">${front}<circle cx="${cx}" cy="${cy}" r="52"/></g>
  <rect x="0" y="${cy - bandH / 2 - 5}" width="${W}" height="${bandH + 10}" fill="#000"/>
</mask></defs>
<g mask="url(#o1)" fill="${c.gold}">${back}</g>
<g mask="url(#o1)">
  <g fill="${c.gold}">${front}</g>
  <circle cx="${cx}" cy="${cy}" r="50" fill="${c.ink}"/>
</g>
<g stroke="${c.ink}" stroke-width="2.4"><path d="M14 ${cy - bandH / 2}H386M14 ${cy + bandH / 2}H386"/></g>
<path fill="${c.ink}" d="${word.d}"/>
<path fill="${c.ink}" d="${tm.d}"/>`, 'Оліяторг');
}

/* ---------- 02 · elegant serif wordmark + simplified symbol ---------- */
function logo02(c) {
  const H = 140, cx = 70, cy = 70, band = 9;
  const petals = ring(12, 0, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 24, 40, 11.5)}"/>`);
  const word = text('ОЛІЯТОРГ', { family: 'cormorant-garamond', weight: 500, size: 66, tracking: .09, x: 168, y: 82 });
  const tag = text('СОНЯШНИКОВА ОЛІЯ · УКРАЇНА', { family: 'manrope', weight: 600, size: 11, tracking: .34, x: 170, y: 112 });
  const W = 168 + Math.max(word.width, tag.width) + 12;
  return svg(W, H, `<defs><mask id="o2">
  <rect width="${W}" height="${H}" fill="#fff"/>
  <rect x="0" y="${cy - band - 3}" width="140" height="${band * 2 + 6}" fill="#000"/>
</mask></defs>
<g mask="url(#o2)">
  <g fill="none" stroke="${c.gold}" stroke-width="2.2" stroke-linejoin="round">${petals}</g>
  <circle cx="${cx}" cy="${cy}" r="16" fill="${c.gold}"/>
</g>
<path d="M6 ${cy - band}H134M6 ${cy + band}H134" stroke="${c.ink}" stroke-width="1.6"/>
<path fill="${c.ink}" d="${word.d}"/>
<path fill="${c.gold}" d="${tag.d}"/>`, 'Оліяторг');
}

/* ---------- 03 · minimal lines + clean sans ---------- */
function logo03(c) {
  const H = 100, cx = 50, cy = 50, band = 6;
  const rays = ring(12, 15, a => {
    const r = a * Math.PI / 180;
    return `M${f2(cx + Math.cos(r) * 22)} ${f2(cy + Math.sin(r) * 22)}L${f2(cx + Math.cos(r) * 38)} ${f2(cy + Math.sin(r) * 38)}`;
  });
  const word = text('ОЛІЯТОРГ', { family: 'manrope', weight: 600, size: 33, tracking: .24, x: 118, y: 62 });
  const W = 118 + word.width + 10;
  return svg(W, H, `<defs><mask id="o3">
  <rect width="${W}" height="${H}" fill="#fff"/>
  <rect x="0" y="${cy - band - 2.5}" width="100" height="${band * 2 + 5}" fill="#000"/>
</mask></defs>
<g mask="url(#o3)" fill="none" stroke="${c.gold}" stroke-width="2.4" stroke-linecap="round">
  <circle cx="${cx}" cy="${cy}" r="14"/>
  <path d="${rays}"/>
</g>
<path d="M6 ${cy - band}H94M6 ${cy + band}H94" stroke="${c.ink}" stroke-width="1.8" stroke-linecap="round"/>
<path fill="${c.ink}" d="${word.d}"/>`, 'Оліяторг');
}

/* ---------- 04 · emblem / badge ---------- */
function logo04(c) {
  const S = 240, cx = 120, cy = 120, bandH = 34;
  const isWhite = c.disc === 'none';
  const back = ring(16, 11.25, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 24, 66, 15)}"/>`);
  const front = ring(16, 0, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 24, 54, 13.5)}"/>`);
  const word = text('ОЛІЯТОРГ', { family: 'cormorant-garamond', weight: 600, size: 25, tracking: .1, x: cx, y: cy + 8.5, anchor: 'middle' });
  const discFill = isWhite ? 'none' : c.disc;
  const discStroke = isWhite ? `stroke="${c.ink}" stroke-width="2"` : '';
  return svg(S, S, `<defs><mask id="o4">
  <rect width="${S}" height="${S}" fill="#fff"/>
  <g fill="none" stroke="#000" stroke-width="2.6">${front}</g>
  <rect x="0" y="${cy - bandH / 2 - 4}" width="${S}" height="${bandH + 8}" fill="#000"/>
</mask></defs>
<circle cx="${cx}" cy="${cy}" r="${isWhite ? 118 : 119}" fill="${discFill}" ${discStroke}/>
<circle cx="${cx}" cy="${cy}" r="108" fill="none" stroke="${c.gold}" stroke-width="1.3"/>
<g mask="url(#o4)">
  <g fill="${c.gold}">${back}${front}</g>
  <circle cx="${cx}" cy="${cy}" r="22" fill="${isWhite ? 'none' : c.disc}" stroke="${c.gold}" stroke-width="2"/>
</g>
<path d="M22 ${cy - bandH / 2}H218M22 ${cy + bandH / 2}H218" stroke="${c.gold}" stroke-width="1.4"/>
<path fill="${isWhite ? c.ink : c.gold}" d="${word.d}"/>`, 'Оліяторг');
}

/* ---------- 05 · stacked: symbol above a serif wordmark ---------- */
function logo05(c) {
  const W = 360, cx = 180, cy = 96, band = 13;
  const back = ring(14, 360 / 28, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 26, 58, 14)}"/>`);
  const front = ring(14, 0, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 26, 48, 12.5)}"/>`);
  const word = text('ОЛІЯТОРГ', { family: 'cormorant-garamond', weight: 500, size: 54, tracking: .12, x: cx, y: 238, anchor: 'middle' });
  const tag = text('СОНЯШНИКОВА ОЛІЯ', { family: 'manrope', weight: 600, size: 11, tracking: .42, x: cx, y: 272, anchor: 'middle' });
  return svg(W, 290, `<defs><mask id="o5">
  <rect width="${W}" height="290" fill="#fff"/>
  <g fill="none" stroke="#000" stroke-width="2.6">${front}</g>
  <rect x="0" y="${cy - band - 3}" width="${W}" height="${band * 2 + 6}" fill="#000"/>
</mask></defs>
<g mask="url(#o5)" fill="${c.gold}">${back}${front}<circle cx="${cx}" cy="${cy}" r="22" fill="${c.ink}"/></g>
<path d="M${cx - 92} ${cy - band}H${cx + 92}M${cx - 92} ${cy + band}H${cx + 92}" stroke="${c.ink}" stroke-width="1.6"/>
<path fill="${c.ink}" d="${word.d}"/>
<path d="M${cx - 18} 254H${cx + 18}" stroke="${c.gold}" stroke-width="1.2"/>
<path fill="${c.gold}" d="${tag.d}"/>`, 'Оліяторг');
}

/* ---------- 06 · oil drop holding the sunflower ---------- */
function logo06(c) {
  const H = 150, cx = 62, cy = 92, R = 44, top = cy - R * 1.78, band = 7;
  const drop = `M${cx} ${f2(top)}C${f2(cx + R * .32)} ${f2(top + R * .62)} ${cx + R} ${f2(cy - R * .62)} ${cx + R} ${cy}` +
               `A${R} ${R} 0 1 1 ${cx - R} ${cy}C${cx - R} ${f2(cy - R * .62)} ${f2(cx - R * .32)} ${f2(top + R * .62)} ${cx} ${f2(top)}Z`;
  const petals = ring(12, 15, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 11, 20, 6.5)}"/>`);
  const word = text('ОЛІЯТОРГ', { family: 'manrope', weight: 700, size: 40, tracking: .12, x: 136, y: 92 });
  const tag = text('НАТУРАЛЬНА СОНЯШНИКОВА ОЛІЯ', { family: 'manrope', weight: 500, size: 10.5, tracking: .3, x: 138, y: 118 });
  const W = 136 + Math.max(word.width, tag.width) + 10;
  return svg(W, H, `<defs><mask id="o6">
  <rect width="${W}" height="${H}" fill="#fff"/>
  <rect x="0" y="${cy - band - 3}" width="${cx * 2 + 4}" height="${band * 2 + 6}" fill="#000"/>
</mask></defs>
<g mask="url(#o6)">
  <path d="${drop}" fill="none" stroke="${c.gold}" stroke-width="2.4"/>
  <g fill="${c.gold}">${petals}</g>
  <circle cx="${cx}" cy="${cy}" r="8.5" fill="${c.ink}"/>
</g>
<path d="M${cx - R - 10} ${cy - band}H${cx + R + 10}M${cx - R - 10} ${cy + band}H${cx + R + 10}" stroke="${c.ink}" stroke-width="1.6"/>
<path fill="${c.ink}" d="${word.d}"/>
<path fill="${c.gold}" d="${tag.d}"/>`, 'Оліяторг');
}

/* ---------- 07 · the sunflower is the letter «О», the band runs through the name ---------- */
function logo07(c) {
  const H = 124, base = 80, cap = 34, size = 46, ox = 44, oy = base - cap / 2;
  const petals = ring(14, 0, a => `<path transform="rotate(${a} ${ox} ${oy})" d="${petal(ox, oy, 12.5, 15.5, 6)}"/>`);
  const rest = text('ЛІЯТОРГ', { family: 'manrope', weight: 700, size, tracking: .1, x: ox + 36, y: base });
  const W = ox + 36 + rest.width + 22;
  const yTop = base - cap - 13, yBot = base + 13;
  return svg(W, H, `<defs><mask id="o7">
  <rect width="${W}" height="${H}" fill="#fff"/>
  <circle cx="${ox}" cy="${oy}" r="32" fill="#000"/>
</mask></defs>
<g fill="${c.gold}">${petals}</g>
<circle cx="${ox}" cy="${oy}" r="10.5" fill="${c.ink}"/>
<path mask="url(#o7)" d="M8 ${yTop}H${W - 8}M8 ${yBot}H${W - 8}" stroke="${c.ink}" stroke-width="1.8"/>
<path fill="${c.ink}" d="${rest.d}"/>`, 'Оліяторг');
}

/* ---------- 08 · rising sun: half a sunflower over the horizon ---------- */
function logo08(c) {
  const W = 340, cx = 170, cy = 118;
  const petals = Array.from({ length: 11 }, (_, i) => -75 + i * 15)
    .map(a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 34, 58, 12)}"/>`).join('');
  const word = text('ОЛІЯТОРГ', { family: 'cormorant-garamond', weight: 500, size: 50, tracking: .14, x: cx, y: 184, anchor: 'middle' });
  const tag = text('УКРАЇНА', { family: 'manrope', weight: 600, size: 11, tracking: .5, x: cx, y: 214, anchor: 'middle' });
  return svg(W, 232, `<g fill="none" stroke="${c.gold}" stroke-width="2.2" stroke-linejoin="round">${petals}</g>
<path d="M${cx - 26} ${cy}A26 26 0 0 1 ${cx + 26} ${cy}Z" fill="${c.gold}"/>
<path d="M20 ${cy}H${W - 20}" stroke="${c.ink}" stroke-width="1.6"/>
<path fill="${c.ink}" d="${word.d}"/>
<path fill="${c.gold}" d="${tag.d}"/>`, 'Оліяторг');
}

/* ---------- 09 · round seal with the name on the ring ---------- */
function logo09(c) {
  const S = 260, cx = 130, cy = 130, band = 9;
  const petals = ring(12, 0, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 17, 32, 9)}"/>`);
  const top = arcText('ОЛІЯТОРГ', { family: 'cormorant-garamond', weight: 600, size: 27, tracking: .22 }, cx, cy, 93, 'top');
  const bottom = arcText('СОНЯШНИКОВА ОЛІЯ', { family: 'manrope', weight: 600, size: 10.5, tracking: .32 }, cx, cy, 106, 'bottom');
  const dot = (x, y) => `<path d="M${x} ${y - 4}L${x + 4} ${y}L${x} ${y + 4}L${x - 4} ${y}Z"/>`;
  return svg(S, S, `<defs><mask id="o9">
  <rect width="${S}" height="${S}" fill="#fff"/>
  <rect x="0" y="${cy - band - 3}" width="${S}" height="${band * 2 + 6}" fill="#000"/>
</mask></defs>
<g fill="none" stroke="${c.ink}">
  <circle cx="${cx}" cy="${cy}" r="126" stroke-width="1.8"/>
  <circle cx="${cx}" cy="${cy}" r="82" stroke-width="1.1"/>
</g>
<circle cx="${cx}" cy="${cy}" r="119" fill="none" stroke="${c.gold}" stroke-width=".9"/>
<g mask="url(#o9)">
  <g fill="none" stroke="${c.gold}" stroke-width="1.8" stroke-linejoin="round">${petals}</g>
  <circle cx="${cx}" cy="${cy}" r="11" fill="${c.gold}"/>
</g>
<path d="M${cx - 80} ${cy - band}H${cx + 80}M${cx - 80} ${cy + band}H${cx + 80}" stroke="${c.ink}" stroke-width="1.3"/>
<g fill="${c.ink}">${top}</g>
<g fill="${c.gold}">${bottom}</g>
<g fill="${c.gold}">${dot(cx - 100, cy)}${dot(cx + 100, cy)}</g>`, 'Оліяторг');
}

/* ---------- 10 · bold geometric, modern agro ---------- */
function logo10(c) {
  const H = 140, cx = 70, cy = 70, band = 8;
  const petals = ring(8, 22.5, a => `<path transform="rotate(${a} ${cx} ${cy})" d="${petal(cx, cy, 20, 44, 21)}"/>`);
  const word = text('ОЛІЯТОРГ', { family: 'manrope', weight: 800, size: 48, tracking: .04, x: 160, y: 84 });
  const tag = text('СОНЯШНИКОВА ОЛІЯ', { family: 'manrope', weight: 600, size: 12, tracking: .36, x: 162, y: 112 });
  const W = 160 + Math.max(word.width, tag.width) + 10;
  return svg(W, H, `<defs><mask id="o10">
  <rect width="${W}" height="${H}" fill="#fff"/>
  <circle cx="${cx}" cy="${cy}" r="21.5" fill="none" stroke="#000" stroke-width="4"/>
  <rect x="0" y="${cy - band - 3}" width="142" height="${band * 2 + 6}" fill="#000"/>
</mask></defs>
<g mask="url(#o10)">
  <g fill="${c.gold}">${petals}</g>
  <circle cx="${cx}" cy="${cy}" r="19" fill="${c.ink}"/>
</g>
<path d="M4 ${cy - band}H136M4 ${cy + band}H136" stroke="${c.ink}" stroke-width="2"/>
<path fill="${c.ink}" d="${word.d}"/>
<path fill="${c.gold}" d="${tag.d}"/>`, 'Оліяторг');
}

const builders = [logo01, logo02, logo03, logo04, logo05, logo06, logo07, logo08, logo09, logo10];
builders.forEach((build, i) => {
  const n = String(i + 1).padStart(2, '0');
  fs.writeFileSync(`${OUT}/logo-${n}.svg`, build(PALETTE.color));
  fs.writeFileSync(`${OUT}/logo-${n}-white.svg`, build(PALETTE.white));
});
console.log('Logo options written to', OUT);
