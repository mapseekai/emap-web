import { cp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function prepareAssets({ siteRoot = projectRoot, sourceRoot = resolve(projectRoot, '../emap'), rebuild = true } = {}) {
  siteRoot = await realpath(siteRoot);
  sourceRoot = await realpath(sourceRoot);
  const manifest = JSON.parse(await readFile(join(sourceRoot, 'package.json'), 'utf8'));
  if (manifest.name !== '@mapseekai/emap') throw new Error('EMAP_SOURCE_DIR must point to the emap engine checkout');
  const displacement = relative(sourceRoot, siteRoot);
  if (!displacement.startsWith('..')) throw new Error('The website must be outside the engine checkout');
  if (rebuild) {
    for (const script of ['build', 'api:build', 'examples:build']) {
      execFileSync('pnpm', ['run', script], {
        cwd: sourceRoot, stdio: 'inherit',
        env: { ...process.env, EMAP_DOCS_DIR: join(siteRoot, 'docs'), pnpm_config_verify_deps_before_run: 'false' },
      });
    }
  }
  const inputs = {
    api: join(sourceRoot, 'dist/api'),
    examples: join(sourceRoot, 'packages/examples/dist'),
  };
  for (const file of [join(inputs.api, 'index.html'), join(inputs.api, 'reflections.json'),
    join(inputs.examples, 'index.html'), join(inputs.examples, 'buffer/index.html'),
    join(inputs.examples, 'emap.svg'), join(inputs.examples, 'emap-worker.js'), join(sourceRoot, 'docs-meta/examples.ts')]) {
    if (!(await stat(file)).isFile()) throw new Error(`Missing engine build artifact: ${file}`);
  }
  const staged = join(siteRoot, '.cache/next-assets');
  await rm(staged, { recursive: true, force: true });
  await mkdir(staged, { recursive: true });
  for (const [name, input] of Object.entries(inputs)) await cp(input, join(staged, name), { recursive: true });
  await mkdir(join(siteRoot, 'static'), { recursive: true });
  for (const name of Object.keys(inputs)) {
    const target = join(siteRoot, 'static', name);
    await rm(target, { recursive: true, force: true });
    await cp(join(staged, name), target, { recursive: true });
  }
  await cp(join(sourceRoot, 'docs-meta/examples.ts'), join(siteRoot, '.cache/examples.mts'));
  let revision = null;
  let dirty = null;
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: sourceRoot, encoding: 'utf8' }).trim());
  } catch { /* An exported source archive need not contain Git metadata. */ }
  await writeFile(join(siteRoot, '.cache/engine-build.json'), JSON.stringify({ version: manifest.version, revision, dirty, reused: !rebuild }, null, 2) + '\n');
  await rm(staged, { recursive: true, force: true });
  console.log(`Prepared API and examples from emap ${manifest.version}${rebuild ? '' : ' (existing build artifacts)'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--reuse')) throw new Error('Usage: node scripts/prepare-assets.mjs [--reuse]');
  await prepareAssets({
    sourceRoot: resolve(process.env.EMAP_SOURCE_DIR ?? resolve(projectRoot, '../emap')),
    rebuild: !args.includes('--reuse'),
  });
}
