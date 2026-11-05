import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = fileURLToPath(new URL('./', import.meta.url));
const port = Number(process.env.PORT) || 5173;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer(async (request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relativePath = normalize(urlPath === '/' ? '/index.html' : urlPath);
  const filePath = join(rootDirectory, relativePath);
  if (!filePath.startsWith(rootDirectory)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(data);
  } catch {
    response.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`ElCad en http://localhost:${port}`));
