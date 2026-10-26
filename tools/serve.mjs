// Local dev server for site/ that applies the same rewrites as Vercel (site/vercel.json), so /vertical.html works
// locally exactly as in production. No caching. Usage: npm run serve  (or: node tools/serve.mjs [port])
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('site');
const port = +process.argv[2] || 3000;
const rewrites = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).rewrites || [];
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url.endsWith('/')) url += 'index.html';
  let file = path.join(root, url);
  // like Vercel: a rewrite applies only when no file matches
  if (!fs.existsSync(file)) {
    const rw = rewrites.find(r => r.source === url);
    if (rw) file = path.join(root, rw.destination);
  }
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404');
  }
  const stat = fs.statSync(file);
  const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;   // the hero video needs byte ranges
  if (range) {
    const [a, b] = range.replace('bytes=', '').split('-');
    const start = +a, end = b ? +b : stat.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store' });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`http://localhost:${port}  (vertical: http://localhost:${port}/vertical.html)`));
