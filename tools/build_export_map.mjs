// Builds the decorative dotted world map of the Export section and writes it into site/index.html between the
// <!-- MAP:START --> and <!-- MAP:END --> markers. One map for every version (style.css sizes it per layout).
//
// Usage:  node tools/build_export_map.mjs
//
// Projection: equirectangular (1° of longitude = 1° of latitude), 360° × 170° (84°N … 86°S) ≈ 2.1 : 1, the whole
// world with Antarctica as a faint band at the bottom. CSS shows it like a photo with object-fit: cover, so on a wide,
// low box only the polar edges are cropped.
// Land: Natural Earth 110m land outlines (public domain), downloaded once into .tmp/ and sampled on an even 2.4° grid
// — every land cell is one dot. The viewBox unit is one grid step, so all dots are ONE short <path> of relative
// moves ("m3 0h0", round caps) per band: the browser draws two elements. No map library, no map data at run time.
// Routes: quadratic arcs from Ukraine to the seven supply regions (the list in the Export feature text), bowed away
// from the equator line between them; pathLength="1", so CSS draws them in with stroke-dashoffset 1 → 0.
// Pins: HTML spans placed in % of the frame, so their pulse is a compositor-only transform/opacity animation that
// never repaints the dots. data-pos places each label (t / b / l / r) where it never covers a neighbour, so on
// phones, where all labels show, they never overlap. Labels are data-i18n (EN in assets/js/i18n.js).
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_land.geojson';
const CACHE = '.tmp/ne_110m_land.geojson';
const HTML = 'site/index.html';

// frame (degrees): the left edge at 169°W keeps Chukotka joined to Asia; one viewBox unit = one grid step
const W = -169, E = 191, N = 84, S = -86, STEP = 2.4, POLAR = -60;
const COLS = Math.round((E - W) / STEP), ROWS = Math.round((N - S) / STEP);
const ux = lon => (lon - W) / STEP;            // viewBox x of a longitude
const uy = lat => (N - lat) / STEP;            // viewBox y of a latitude
const r1 = v => +v.toFixed(2);

const HOME = { key: 'map.ua', ua: 'Україна', lon: 31, lat: 49, pos: 't' };
const REGIONS = [
  { key: 'map.usa', ua: 'США', lon: -98, lat: 39, pos: 't' },
  { key: 'map.europe', ua: 'Європа', lon: 6, lat: 48, pos: 'l' },
  { key: 'map.me', ua: 'Близький Схід', lon: 45, lat: 25, pos: 'l' },
  { key: 'map.africa', ua: 'Африка', lon: 21, lat: 3, pos: 'l' },
  { key: 'map.india', ua: 'Індія', lon: 78, lat: 21, pos: 'b' },
  { key: 'map.china', ua: 'Китай', lon: 106, lat: 34, pos: 't' },
  { key: 'map.australia', ua: 'Австралія', lon: 134, lat: -25, pos: 'b' }
];

if (!fs.existsSync(CACHE)) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  fs.writeFileSync(CACHE, await res.text());
}
const geo = JSON.parse(fs.readFileSync(CACHE, 'utf8'));

// polygons as arrays of rings ([lon, lat] points); the first ring is the outline, the rest are holes
const polys = geo.features.flatMap(f =>
  f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
const inRing = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const onLand = (lon, lat) => {
  const l = lon > 180 ? lon - 360 : lon;   // the frame runs past 180° on the right (Chukotka)
  return polys.some(([outer, ...holes]) => inRing(l, lat, outer) && !holes.some(h => inRing(l, lat, h)));
};

// one path per band (land, Antarctica), relative moves from dot to dot: tiny, and gzip folds the repeats
const bands = { land: { d: '', x: 0, y: 0, n: 0 }, polar: { d: '', x: 0, y: 0, n: 0 } };
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const lon = W + (col + .5) * STEP, lat = N - (row + .5) * STEP;
    if (!onLand(lon, lat)) continue;
    const b = bands[lat < POLAR ? 'polar' : 'land'];
    const x = col + .5, y = row + .5;
    b.d += b.n ? `m${r1(x - b.x)} ${r1(y - b.y)}h0` : `M${x} ${y}h0`;
    b.x = x; b.y = y; b.n++;
  }
}

// an arc from Ukraine to a region, bowed by a fifth of its length (at most 14°, so the long USA arc stays low enough
// for a cropped top edge), away from the lower side (arcs read as flight paths)
const route = r => {
  const x0 = ux(HOME.lon), y0 = uy(HOME.lat), x1 = ux(r.lon), y1 = uy(r.lat);
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  let nx = -dy / len, ny = dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const bow = Math.min(len * .2, 14 / STEP);
  const cx = (x0 + x1) / 2 + nx * bow, cy = (y0 + y1) / 2 + ny * bow;
  return `M${r1(x0)} ${r1(y0)}Q${r1(cx)} ${r1(cy)} ${r1(x1)} ${r1(y1)}`;
};
const pct = (v, total) => r1(v / total * 100) + '%';
const pin = (r, k, mod = '') =>
  `              <span class="map__pin${mod}" data-pos="${r.pos}" style="left: ${pct(ux(r.lon), COLS)}; top: ${pct(uy(r.lat), ROWS)};${k == null ? '' : ` --k: ${k};`}"><span class="map__label" data-i18n="${r.key}">${r.ua}</span></span>`;

const block = `<!-- MAP:START — built by tools/build_export_map.mjs; do not edit by hand -->
        <div class="export__map" aria-hidden="true">
          <div class="map">
            <div class="map__frame" style="--ar: ${r1(COLS / ROWS)};">
              <svg class="map__svg" viewBox="0 0 ${COLS} ${ROWS}" focusable="false">
                <path class="map__land" d="${bands.land.d}"/>
                <path class="map__land map__land--polar" d="${bands.polar.d}"/>
${REGIONS.map((r, k) => `                <path class="map__route" pathLength="1" style="--k: ${k};" d="${route(r)}"/>`).join('\n')}
              </svg>
${pin(HOME, null, ' map__pin--home')}
${REGIONS.map((r, k) => pin(r, k)).join('\n')}
            </div>
          </div>
        </div>
        <!-- MAP:END -->`;

let html = fs.readFileSync(HTML, 'utf8');
const re = /<!-- MAP:START[\s\S]*?<!-- MAP:END -->/;
if (!re.test(html)) throw new Error('markers <!-- MAP:START --> / <!-- MAP:END --> not found in ' + HTML);
html = html.replace(re, block);
fs.writeFileSync(HTML, html);
console.log(`${COLS}×${ROWS} grid, ${bands.land.n} + ${bands.polar.n} dots, ${REGIONS.length} routes, ${(block.length / 1024).toFixed(1)} KB → ${HTML}`);
