import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

export const MIME_TYPES = Object.freeze({
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
});

export const DEFAULT_CHROMIUM_ARGS = Object.freeze([
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader'
]);

/**
 * Creates and starts an HTTP server serving repository root on an ephemeral port (port: 0).
 * Guarantees zero port collisions across test suites and rapid test runs.
 *
 * @returns {Promise<http.Server>}
 */
export function startTestServer() {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || !reqPath) reqPath = '/index.html';
    const filePath = path.join(REPO_ROOT, reqPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, () => {
      resolve(server);
    });
  });
}

/**
 * Launches Puppeteer Chromium with standardized software WebGL rendering flags.
 *
 * @param {object} [options]
 * @returns {Promise<puppeteer.Browser>}
 */
export async function launchTestBrowser(options = {}) {
  const args = [...DEFAULT_CHROMIUM_ARGS, ...(options.args || [])];
  return puppeteer.launch({
    headless: 'new',
    pipe: true,
    ...options,
    args
  });
}

/**
 * Runs a browser-based integration test within an isolated HTTP server and Puppeteer lifecycle.
 * Automatically provisions an ephemeral port, opens a page, and cleans up all sockets and processes.
 *
 * @param {Function} testFn Async callback ({ server, browser, page, baseUrl, port }) => Promise<void>
 * @param {object} [options]
 * @param {object} [options.viewport] Viewport configuration (default: 1280x720)
 * @param {object} [options.launchOptions] Additional Puppeteer launch options
 */
export async function withBrowserTest(testFn, options = {}) {
  const server = await startTestServer();
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  let browser = null;

  try {
    browser = await launchTestBrowser(options.launchOptions);
    const page = await browser.newPage();
    const viewport = options.viewport || { width: 1280, height: 720 };
    await page.setViewport(viewport);

    await testFn({
      server,
      browser,
      page,
      baseUrl,
      port
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
    if (server) {
      try {
        await new Promise((resolve) => server.close(resolve));
      } catch (_) {}
    }
  }
}
