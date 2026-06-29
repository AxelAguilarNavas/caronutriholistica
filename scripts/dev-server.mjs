// Servidor estático mínimo para desarrollo local (sin dependencias).
// Sirve la raíz del proyecto; "/" devuelve evaluacion.html.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || 8123;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split('?')[0]);
  if (path === '/') path = '/evaluacion.html';
  // Evita path traversal
  const file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}).listen(PORT, () => {
  console.log(`Dev server en http://localhost:${PORT}  (prueba: http://localhost:${PORT}/?userId=U123&sourcePlatform=manychat&channel=whatsapp)`);
});
