import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const apiOrigin = 'https://kristenblackburnvolleyballcamps.com';
const gamesCdnOrigin = 'https://cdn.jsdelivr.net/gh/lostgemsy/67';
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const staticPrefixes = [
  '/app.css',
  '/app.js',
  '/public/',
  '/t0.gstatic.com/',
  '/www.googletagmanager.com/',
];
const appRoutePrefixes = [
  '/g',
  '/music',
  '/h',
  '/chat',
  '/assistant',
  '/profile',
  '/members',
  '/changelog',
  '/l',
  '/emu',
  '/extensions',
  '/login',
  '/reset',
  '/compat',
  '/tools',
  '/shop',
  '/achievements',
  '/mod',
];

function proxyApi(request, response, origin = apiOrigin) {
  const originUrl = new URL(origin);
  const originBase = `${originUrl.origin}${originUrl.pathname.replace(/\/+$/, '')}/`;
  const upstreamUrl = new URL(request.url.replace(/^\/+/, ''), originBase);
  const headers = {
    host: upstreamUrl.host,
    origin: originUrl.origin,
    referer: originBase,
  };

  for (const name of [
    'accept',
    'accept-encoding',
    'content-length',
    'content-type',
    'if-modified-since',
    'if-none-match',
    'range',
    'user-agent',
  ]) {
    if (request.headers[name]) headers[name] = request.headers[name];
  }

  const upstream = httpsRequest(
    upstreamUrl,
    { method: request.method, headers },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );

  upstream.on('error', (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(`Music API unavailable: ${error.message}`);
    } else {
      response.destroy(error);
    }
  });

  request.pipe(upstream);
}

function serveHohogamesDocument(response) {
  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': mimeTypes['.svg'],
  });
  createReadStream(resolve(root, 'index.svg')).pipe(response);
}

async function serveStatic(request, pathname, response) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end('Bad path');
    return;
  }

  if (!staticPrefixes.some((prefix) => decodedPath.startsWith(prefix))) {
    response.writeHead(404).end('Not found');
    return;
  }

  const filePath = resolve(root, `.${decodedPath}`);
  if (!filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) throw new Error('Not a file');
    const contentType = mimeTypes[extname(filePath)] || 'application/octet-stream';
    const compressible = /^(text\/|application\/(?:javascript|json|xml)|image\/svg\+xml)/.test(contentType);
    const acceptsGzip = /\bgzip\b/.test(request.headers['accept-encoding'] || '');
    const headers = { 'content-type': contentType, 'cache-control': 'no-cache' };

    if (compressible && acceptsGzip) {
      headers['content-encoding'] = 'gzip';
      headers.vary = 'Accept-Encoding';
      response.writeHead(200, headers);
      createReadStream(filePath).pipe(createGzip()).pipe(response);
      return;
    }

    headers['content-length'] = fileInfo.size;
    response.writeHead(200, headers);
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
}

createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');

  if (url.pathname === '/' || url.pathname === '/index.html') {
    if (url.pathname === '/index.html') {
      response.writeHead(302, { location: '/' }).end();
      return;
    }
    serveHohogamesDocument(response);
    return;
  }

  if (url.pathname === '/embed') {
    serveHohogamesDocument(response);
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    proxyApi(request, response, gamesCdnOrigin);
    return;
  }

  if (/^\/(?:gmteb|kqxhh)\//.test(url.pathname) || url.pathname === '/4mkcjl.js') {
    proxyApi(request, response, gamesCdnOrigin);
    return;
  }

  if (/^\/(?:stores|covers|img)\//.test(url.pathname)) {
    proxyApi(request, response);
    return;
  }

  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    proxyApi(request, response);
    return;
  }

  const isAppRoute = appRoutePrefixes.some((prefix) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
  if (request.method === 'GET' && (isAppRoute || (request.headers.accept || '').includes('text/html'))) {
    serveHohogamesDocument(response);
    return;
  }

  void serveStatic(request, url.pathname, response);
}).listen(port, '0.0.0.0', () => {
  console.log(`HOHOGAMES is available at http://localhost:${port}`);
});