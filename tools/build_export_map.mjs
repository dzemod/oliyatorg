// Builds the decorative dotted world map of the Export section (horizontal page) and writes it into site/index.html
// between the <!-- MAP:START --> and <!-- MAP:END --> markers.
//
// Usage:  node tools/build_export_map.mjs
//
// Land: Natural Earth 110m land outlines (public domain), downloaded once into .tmp/ and sampled on a 3° grid —
// every land cell becomes one dot. All dots are ONE <path> of zero-length round-capped segments ("M x y h0"), so the
// browser draws a single element. The site loads no map library and no map data at run time.
// Routes: quadratic curves from Ukraine to the seven supply regions (the list in the Export feature text), bowed
// upwards; pathLength="1", so CSS draws them in with stroke-dashoffset 1 → 0.
// Pins: HTML spans placed in % over the SVG (the map keeps its aspect ratio), so their pulse is a compositor-only
// transform/opacity animation that never repaints the dots. Labels are data-i18n (EN in assets/js/i18n.js).
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_land.geojson';
const CACHE = '.tmp/ne_110m_land.geojson';
const HTML = 'site/index.html';

// map frame (degrees) and scale: x = (lon - W) * K, y = (N - lat) * K
const W = -170, E = 190, N = 78, S = -56, K = 2, STEP = 3;
const px = lon => +((lon - W) * K).toFixed(1);
const py = lat => +((N - lat) * K).toFixed(1);
const VW = (E - W) * K, VH = (N - S) * K;

const HOME = { key: 'map.ua', ua: 'Україна', lon: 31, lat: 49 };
const REGIONS = [
  { key: 'map.usa', ua: 'США', lon: -98, lat: 39 },
  { key: 'map.europe', ua: 'Європа', lon: 8, lat: 49 },
  { key: 'map.me', ua: 'Близький Схід', lon: 45, lat: 26 },
  { key: 'map.africa', ua: 'Африка', lon: 20, lat: 5 },
  { key: 'map.india', ua: 'Індія', lon: 78, lat: 22 },
  { key: 'map.china', ua: 'Китай', lon: 105, lat: 34 },
  { key: 'map.australia', ua: 'Австралія', lon: 134, lat: -25 }
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
  const l = lon > 180 ? lon - 360 : lon;   // the frame runs past 180° on the right (far-east Russia)
  return polys.some(([outer, ...holes]) => inRing(l, lat, outer) && !holes.some(h => inRing(l, lat, h)));
};

let d = '', dots = 0;
for (let lat = N - STEP / 2; lat > S; lat -= STEP) {
  for (let lon = W + STEP / 2; lon < E; lon += STEP) {
    if (onLand(lon, lat)) { d += `M${px(lon)} ${py(lat)}h0`; dots++; }
  }
}

// a curve from Ukraine to (x, y), bowed upwards by a quarter of its length
const route = r => {
  const x0 = px(HOME.lon), y0 = py(HOME.lat), x1 = px(r.lon), y1 = py(r.lat);
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  let nx = -dy / len, ny = dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const cx = (x0 + x1) / 2 + nx * len * .25, cy = (y0 + y1) / 2 + ny * len * .25;
  return `M${x0} ${y0}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1} ${y1}`;
};
const pct = (v, total) => (v / total * 100).toFixed(2) + '%';
const pin = (r, k, mod = '') =>
  `          <span class="map__pin${mod}" style="left: ${pct(px(r.lon), VW)}; top: ${pct(py(r.lat), VH)};${k == null ? '' : ` --k: ${k};`}"><span class="map__label" data-i18n="${r.key}">${r.ua}</span></span>`;

const block = `<!-- MAP:START — built by tools/build_export_map.mjs; do not edit by hand -->
        <div class="export__map" aria-hidden="true">
          <div class="map" style="aspect-ratio: ${VW} / ${VH}; --ar: ${(VW / VH).toFixed(4)};">
            <svg class="map__svg" viewBox="0 0 ${VW} ${VH}" focusable="false">
              <path class="map__land" d="${d}"/>
${REGIONS.map((r, k) => `              <path class="map__route" pathLength="1" style="--k: ${k};" d="${route(r)}"/>`).join('\n')}
            </svg>
${pin(HOME, null, ' map__pin--home')}
${REGIONS.map((r, k) => pin(r, k)).join('\n')}
          </div>
        </div>
        <!-- MAP:END -->`;

let html = fs.readFileSync(HTML, 'utf8');
const re = /<!-- MAP:START[\s\S]*?<!-- MAP:END -->/;
if (!re.test(html)) throw new Error('markers <!-- MAP:START --> / <!-- MAP:END --> not found in ' + HTML);
html = html.replace(re, block);
fs.writeFileSync(HTML, html);
console.log(`${dots} dots, ${REGIONS.length} routes, ${(block.length / 1024).toFixed(1)} KB → ${HTML}`);
