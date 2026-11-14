import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build, createServer } from 'vite';
import { PRODUCTION_CSP } from '../vite.config.ts';

const ROOT_DIR = resolve(import.meta.dirname, '..');
const SOURCE_HTML_PATH = resolve(ROOT_DIR, 'index.html');
const DIST_HTML_PATH = resolve(ROOT_DIR, 'dist', 'index.html');

const CSP_META_TAG_REGEX =
  /<meta\s+[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi;
const CSP_CONTENT_REGEX =
  /<meta\s+[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]*)"[^>]*>/i;

const EXPECTED_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
];

test('production build injects the exact CSP meta tag once into dist/index.html', async () => {
  await build({
    root: ROOT_DIR,
    logLevel: 'silent',
  });

  const distHtml = await readFile(DIST_HTML_PATH, 'utf8');
  const metaMatches = distHtml.match(CSP_META_TAG_REGEX) ?? [];
  assert.equal(metaMatches.length, 1, 'Expected exactly one CSP meta tag in dist/index.html');

  const headMatch = distHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  assert.ok(headMatch, 'Expected dist/index.html to contain a <head> section');
  const headHtml = headMatch[1];

  const cspIndexInHead = headHtml.search(CSP_META_TAG_REGEX);
  assert.ok(cspIndexInHead >= 0, 'Expected CSP meta tag to be inside <head>');

  const charsetIndexInHead = headHtml.search(/<meta\s+charset=/i);
  assert.ok(charsetIndexInHead >= 0 && charsetIndexInHead < cspIndexInHead, 'Expected <meta charset> before CSP meta tag');

  const firstScriptIndex = distHtml.search(/<script\b/i);
  const firstStylesheetIndex = distHtml.search(/<link\b[^>]*rel=["']stylesheet["']/i);
  const cspIndexInDoc = distHtml.search(CSP_META_TAG_REGEX);

  assert.ok(firstScriptIndex > cspIndexInDoc, 'Expected CSP meta tag to appear before all <script> tags');
  assert.ok(firstStylesheetIndex > cspIndexInDoc, 'Expected CSP meta tag to appear before all stylesheet <link> tags');

  const contentMatch = distHtml.match(CSP_CONTENT_REGEX);
  assert.ok(contentMatch, 'Expected CSP meta tag to include a content attribute');

  const cspContent = contentMatch[1];
  assert.equal(cspContent, PRODUCTION_CSP);

  const directives = cspContent
    .split(';')
    .map((directive) => directive.trim())
    .filter(Boolean);

  for (const expectedDirective of EXPECTED_DIRECTIVES) {
    assert.ok(
      directives.includes(expectedDirective),
      `Expected CSP directive "${expectedDirective}" to be present`,
    );
  }
  assert.equal(directives.length, EXPECTED_DIRECTIVES.length);

  assert.equal(/frame-ancestors/i.test(cspContent), false);
  assert.equal(/unsafe-inline/i.test(cspContent), false);
  assert.equal(/unsafe-eval/i.test(cspContent), false);
});

test('source index.html remains free of any CSP meta tag', async () => {
  const sourceHtml = await readFile(SOURCE_HTML_PATH, 'utf8');
  const metaMatches = sourceHtml.match(CSP_META_TAG_REGEX) ?? [];
  assert.equal(metaMatches.length, 0);
});

test('development server HTML response does not include production CSP', async () => {
  const server = await createServer({
    root: ROOT_DIR,
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
  });

  try {
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address === 'object', 'Expected dev server to expose a listening port');

    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    assert.equal(response.status, 200);

    const devHtml = await response.text();
    const metaMatches = devHtml.match(CSP_META_TAG_REGEX) ?? [];
    assert.equal(metaMatches.length, 0, 'Dev server HTML must not include production CSP meta tag');
  } finally {
    await server.close();
  }
});
