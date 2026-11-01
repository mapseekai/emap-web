import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareAssets } from '../scripts/prepare-assets.mjs';

test('sync replaces generated output only after validating all inputs', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'emap-web-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const sourceRoot = join(temp, 'engine');
  const siteRoot = join(temp, 'site');
  async function put(root, path, content = path) {
    const target = join(root, path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, content);
  }
  await put(sourceRoot, 'package.json', JSON.stringify({ name: '@mapseekai/emap', version: '0.15.0' }));
  await put(siteRoot, 'static/api/old.html', 'preserved');
  await put(siteRoot, 'static/custom.txt', 'owned by website');
  await assert.rejects(prepareAssets({ sourceRoot, siteRoot, rebuild: false }), /ENOENT/);
  assert.equal(await readFile(join(siteRoot, 'static/api/old.html'), 'utf8'), 'preserved');
  for (const path of ['dist/api/index.html', 'dist/api/reflections.json',
    'packages/examples/dist/index.html', 'packages/examples/dist/buffer/index.html',
    'packages/examples/dist/emap.svg', 'packages/examples/dist/emap-worker.js', 'docs-meta/examples.ts']) await put(sourceRoot, path);
  await prepareAssets({ sourceRoot, siteRoot, rebuild: false });
  assert.equal(await readFile(join(siteRoot, 'static/examples/buffer/index.html'), 'utf8'), 'packages/examples/dist/buffer/index.html');
  await assert.rejects(readFile(join(siteRoot, 'static/api/old.html')), /ENOENT/);
  assert.equal(await readFile(join(siteRoot, 'static/custom.txt'), 'utf8'), 'owned by website');
  assert.equal(JSON.parse(await readFile(join(siteRoot, '.cache/engine-build.json'), 'utf8')).reused, true);
});

test('rejects a checkout belonging to another package', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'emap-web-invalid-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const sourceRoot = join(temp, 'engine');
  const siteRoot = join(temp, 'site');
  await mkdir(sourceRoot); await mkdir(siteRoot);
  await writeFile(join(sourceRoot, 'package.json'), '{"name":"another-package"}');
  await assert.rejects(prepareAssets({ sourceRoot, siteRoot, rebuild: false }), /emap engine checkout/);
});
