// Minimal dependency-free static server for the built `dist/` (production / Railway).
// Vite is only a build-time dep, so we don't rely on `vite preview` at runtime.
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname, normalize } from 'path';

const DIR = join(process.cwd(), 'dist');
const PORT = process.env.PORT || 4173;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.mp3': 'audio/mpeg', '.txt': 'text/plain',
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = normalize(join(DIR, p));
    if (!file.startsWith(DIR)) { res.writeHead(403); return res.end('forbidden'); }
    let data;
    try {
      data = await readFile(file);
    } catch {
      // unknown non-asset route → fall back to the game's index.html
      if (!extname(p)) data = await readFile(join(DIR, 'index.html'));
      else { res.writeHead(404); return res.end('not found'); }
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`serving dist/ on :${PORT}`));
