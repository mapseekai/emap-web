import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

interface PreviewResponse {
  statusCode: number;
  setHeader(name: string, value: string | number | readonly string[]): void;
  end(chunk?: string | Uint8Array): void;
}

type PreviewHandler = (
  request: { method?: string; url?: string },
  response: PreviewResponse,
) => void | Promise<void>;

async function loadPreviewModule() {
  const moduleUrl = pathToFileURL(resolve(process.cwd(), 'scripts/preview-docs.mjs')).href;
  return import(/* @vite-ignore */ moduleUrl).catch(() => null);
}

async function requestPreview(handler: PreviewHandler, url: string, method = 'GET') {
  const headers = new Map<string, string>();
  const chunks: Buffer[] = [];
  let finish: (result: { status: number; headers: Map<string, string>; body: Buffer }) => void;
  const completed = new Promise<{ status: number; headers: Map<string, string>; body: Buffer }>(
    (resolveRequest) => {
      finish = resolveRequest;
    },
  );
  const response: PreviewResponse = {
    statusCode: 200,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value));
    },
    end(chunk) {
      if (chunk !== undefined) chunks.push(Buffer.from(chunk));
      finish({ status: response.statusCode, headers, body: Buffer.concat(chunks) });
    },
  };

  await handler({ method, url }, response);
  return completed;
}

describe('release documentation checklist', () => {

  it('serves docs, example routes, and static assets from the composed build', async () => {
    const previewModule = await loadPreviewModule();
    expect(
      previewModule,
      'scripts/preview-docs.mjs must export createDocsPreviewHandler',
    ).not.toBeNull();
    if (!previewModule) return;

    const root = await mkdtemp(join(tmpdir(), 'emap-docs-preview-'));

    try {
      const build = resolve(root, 'build');
      await mkdir(resolve(build, 'examples/buffer'), { recursive: true });
      await mkdir(resolve(build, 'examples/fixtures'), { recursive: true });
      await mkdir(resolve(build, 'examples/vendor'), { recursive: true });
      await mkdir(resolve(build, 'assets'), { recursive: true });
      await writeFile(resolve(build, 'index.html'), '<!doctype html><title>docs</title>');
      await writeFile(
        resolve(build, 'examples/buffer/index.html'),
        '<!doctype html><title>buffer</title>',
      );
      await writeFile(resolve(build, 'assets/site.css'), 'body { color: navy; }');
      await writeFile(resolve(build, 'examples/vendor/emap.js'), 'globalThis.emap = {};');
      await writeFile(resolve(build, 'examples/fixtures/starter.geojson'), '{"type":"Point"}');
      await writeFile(resolve(build, 'examples/fixtures/starter.parquet'), 'PAR1fixture');
      await writeFile(resolve(build, 'examples/emap-worker.js'), 'self.postMessage("ready");');

      const handler = previewModule.createDocsPreviewHandler({ root }) as PreviewHandler;
      const docs = await requestPreview(handler, '/mapseekai/emap/');
      const example = await requestPreview(handler, '/mapseekai/emap/examples/buffer/');
      const spa = await requestPreview(handler, '/mapseekai/emap/concepts/not-generated/');
      const css = await requestPreview(handler, '/mapseekai/emap/assets/site.css');
      const vendor = await requestPreview(handler, '/mapseekai/emap/examples/vendor/emap.js');
      const fixture = await requestPreview(
        handler,
        '/mapseekai/emap/examples/fixtures/starter.geojson',
      );
      const parquet = await requestPreview(
        handler,
        '/mapseekai/emap/examples/fixtures/starter.parquet',
      );
      const worker = await requestPreview(handler, '/mapseekai/emap/examples/emap-worker.js');
      const missingAsset = await requestPreview(handler, '/mapseekai/emap/assets/missing.js');

      expect(docs).toMatchObject({ status: 200 });
      expect(docs.body.toString()).toContain('<title>docs</title>');
      expect(example).toMatchObject({ status: 200 });
      expect(example.body.toString()).toContain('<title>buffer</title>');
      expect(spa.body.toString()).toContain('<title>docs</title>');
      expect(css.headers.get('content-type')).toBe('text/css; charset=utf-8');
      expect(vendor.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
      expect(fixture.headers.get('content-type')).toBe('application/geo+json; charset=utf-8');
      expect(parquet.headers.get('content-type')).toBe('application/octet-stream');
      expect(worker.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
      expect(missingAsset.status).toBe(404);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('serves successful HEAD requests without a response body', async () => {
    const previewModule = await loadPreviewModule();
    expect(previewModule).not.toBeNull();
    if (!previewModule) return;

    const root = await mkdtemp(join(tmpdir(), 'emap-docs-preview-head-'));

    try {
      await mkdir(resolve(root, 'build'), { recursive: true });
      await writeFile(resolve(root, 'build/index.html'), '<!doctype html>docs');

      const handler = previewModule.createDocsPreviewHandler({ root }) as PreviewHandler;
      const response = await requestPreview(handler, '/mapseekai/emap/', 'HEAD');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
      expect(response.headers.get('content-length')).toBe('19');
      expect(response.body).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('converts a lookup failure into a completed 500 response', async () => {
    const previewModule = await loadPreviewModule();
    expect(previewModule).not.toBeNull();
    if (!previewModule) return;

    const handler = previewModule.createDocsPreviewHandler({
      root: process.cwd(),
      fileSystem: {
        readFile,
        stat: async () => {
          throw Object.assign(new Error('lookup unavailable'), { code: 'EIO' });
        },
      },
    }) as PreviewHandler;
    const response = await requestPreview(handler, '/mapseekai/emap/');

    expect(response.status).toBe(500);
    expect(response.body.toString()).toContain('lookup unavailable');
  });

  it('keeps HEAD empty when reading the resolved file fails', async () => {
    const previewModule = await loadPreviewModule();
    expect(previewModule).not.toBeNull();
    if (!previewModule) return;

    const root = await mkdtemp(join(tmpdir(), 'emap-docs-preview-read-error-'));

    try {
      await mkdir(resolve(root, 'build'), { recursive: true });
      await writeFile(resolve(root, 'build/index.html'), '<!doctype html>docs');
      const handler = previewModule.createDocsPreviewHandler({
        root,
        fileSystem: {
          stat,
          readFile: async () => {
            throw Object.assign(new Error('read unavailable'), { code: 'EIO' });
          },
        },
      }) as PreviewHandler;

      const getResponse = await requestPreview(handler, '/mapseekai/emap/');
      const headResponse = await requestPreview(handler, '/mapseekai/emap/', 'HEAD');

      expect(getResponse.status).toBe(500);
      expect(getResponse.body.toString()).toContain('read unavailable');
      expect(headResponse.status).toBe(500);
      expect(headResponse.body).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns 405 with the allowed preview methods', async () => {
    const previewModule = await loadPreviewModule();
    expect(previewModule).not.toBeNull();
    if (!previewModule) return;

    const handler = previewModule.createDocsPreviewHandler({
      root: process.cwd(),
    }) as PreviewHandler;
    const response = await requestPreview(handler, '/mapseekai/emap/', 'POST');

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  });  it.each([
    '/mapseekai/emap/%',
    '/mapseekai/emap/%00index.html',
  ])('rejects malformed preview paths: %s', async (url) => {
    const previewModule = await loadPreviewModule();
    expect(previewModule).not.toBeNull();
    if (!previewModule) return;

    const handler = previewModule.createDocsPreviewHandler({
      root: process.cwd(),
    }) as PreviewHandler;
    const response = await requestPreview(handler, url);

    expect(response.status).toBe(400);
  });

  it.each([
    '/mapseekai/emap/../package.json',
    '/mapseekai/emap/%2e%2e/package.json',
    '/mapseekai/emap/..%2Fpackage.json',
    '/mapseekai/emap/%5c..%5cpackage.json',
    '/mapseekai/emap/\\..\\package.json',
  ])('rejects preview path traversal: %s', async (url) => {
    const previewModule = await loadPreviewModule();
    expect(
      previewModule,
      'scripts/preview-docs.mjs must export createDocsPreviewHandler',
    ).not.toBeNull();
    if (!previewModule) return;

    const root = await mkdtemp(join(tmpdir(), 'emap-docs-preview-traversal-'));

    try {
      await mkdir(resolve(root, 'build'), { recursive: true });
      await writeFile(resolve(root, 'build/index.html'), '<!doctype html>');
      await writeFile(resolve(root, 'package.json'), '{"private":true}');

      const handler = previewModule.createDocsPreviewHandler({ root }) as PreviewHandler;
      const response = await requestPreview(handler, url);

      expect(response.status).toBe(403);
      expect(response.body.toString()).not.toContain('private');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });


});
