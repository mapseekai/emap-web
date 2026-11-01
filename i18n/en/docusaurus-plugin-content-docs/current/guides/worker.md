---
id: worker
slug: /guides/worker
title: Web Worker
description: "Configure background operation routing, Worker assets, and task lifecycles."
api: ["Emap", "MapOptions", "MapshaperWorkerPool", "MapshaperWorkerPoolOptions", "createEmapWorkerRuntime", "EmapWorkerRuntimeOptions", "EmapWorkerPool"]
examples: ["web-worker"]
stability: stable
verifiedVersion: unreleased
---

# Configure Web Workers

Web Workers offload heavy Mapshaper operations, GPU geometry preparation, MSDF text atlas generation, GeoPackage imports, and GeoTIFF decoding from the browser main thread. Each subsystem uses its own Worker script and configuration, and background tasks still consume browser memory for transfers and snapshots.

## Route Mapshaper data operations

`useWorker` defaults to `false` and controls whether `map.ops` Mapshaper commands run in a background Worker:

- **`false`**: Runs all Mapshaper operations on the main thread.
- **`true`**: Forces eligible Mapshaper operations into the Worker pool.
- **`'auto'`**: Routes commands based on operation cost and dataset size. The default vertex threshold (`workerThreshold`) is `50_000` vertices (heavy overlay commands use half that threshold, while lightweight field operations stay on the main thread).

```ts
const routedMap = await Emap.create({
  container: 'map',
  useWorker: 'auto',
  workerThreshold: 50_000,
  workerUrl: '/assets/emap/emap-worker.js',
  workerPoolSize: 2,
});
// When this map is no longer needed:
await routedMap.dispose();
```

Make sure `/assets/emap-worker.js` (and `mapshaper-vendor.js` in the same directory) are deployed and reachable. You can also provide a custom `workerRouting` callback to override routing decisions per command.

## Share a unified Worker runtime across maps

<span id="shared-tasklane-runtime" />

If your application mounts multiple maps or switches views frequently, create a shared `workerRuntime` with `createEmapWorkerRuntime()` so maps reuse the same Worker pool:

```ts
import { Emap, createEmapWorkerRuntime } from '@mapseekai/emap';

const runtime = createEmapWorkerRuntime({
  urls: {
    mapshaper: '/assets/emap/emap-worker.js',
    geometry: '/assets/emap/emap-geometry-worker.js',
    msdf: '/assets/emap/emap-msdf-worker.js',
    geotiff: '/assets/emap/emap-geotiff-worker.js',
    geopackage: '/assets/emap/emap-geopackage-worker.js',
  },
});
const map = await Emap.create({ container: 'map', workerRuntime: runtime });
await map.dispose();
await runtime.dispose();
```

**Ownership rule**: A `workerRuntime` passed into `Emap.create()` is borrowed by the map. Calling `await map.dispose()` releases the map's tasks but does **not** terminate the shared runtime. Dispose all consuming maps first, then call `await runtime.dispose()` in your application teardown. (By contrast, do not share a legacy exclusive `workerPool` across multiple maps that each dispose it.)

## Deploy Worker and WASM assets correctly

<span id="publish-worker-assets" />

- **Version alignment**: Every Worker script (`emap-worker.js`, `emap-geometry-worker.js`, `emap-msdf-worker.js`, `emap-geotiff-worker.js`, `emap-geopackage-worker.js`), `mapshaper-vendor.js`, and WASM asset must come from the exact same `@mapseekai/emap` build version.
- **Independent GPU Workers**: `geometryWorkerUrl` and `msdfWorkerUrl` accelerate GPU geometry preparation and text rendering independently of `useWorker`.
- **Verify HTTP responses in production**: Single-page application (SPA) hosts often return `index.html` with HTTP status `200` for missing static asset URLs. Trigger a real Worker task in your production preview and verify that the browser receives `application/javascript` and `application/wasm` responses.

### Copy package assets

Worker and WASM files live directly in the package's `dist/` directory. The commands below copy the relevant assets to the `/assets/emap/` paths used above. If you use only some features, copy just the files listed for them in the [compatibility reference](../reference/compatibility.md).

```sh
mkdir -p public/assets/emap
cp node_modules/@mapseekai/emap/dist/*-worker.js \
  node_modules/@mapseekai/emap/dist/mapshaper-vendor.js \
  node_modules/@mapseekai/emap/dist/mapshaper-vendor.mjs \
  node_modules/@mapseekai/emap/dist/sql-wasm.wasm public/assets/emap/
cp -R node_modules/@mapseekai/emap/dist/msdf public/assets/emap/
```

Repeat the copy after upgrading `@mapseekai/emap`, or add an equivalent step to your build. Adjust the URLs above if the application is hosted under a subpath.

## Handle cancellation, version checks, and diagnostics

<span id="result-commit-and-version-checks" />
<span id="continuous-work-and-physical-cleanup" />
<span id="binary-transport-and-budgets" />

- **Task-scoped cancellation**: Cancelling an operation via `AbortSignal` aborts that task without destroying shared Worker initialization. If a GeoTIFF Worker session is lost or reset, reopen the raster source before issuing new window reads.
- **Job events vs. commit results**: `workerjobstart` and `workerjobend` report Worker round-trip timing. Even after `workerjobend` reports `ok: true`, the main thread still checks whether the target source was modified while the Worker was running (`stale-operation`). Always inspect `OpResult.ok` to confirm that the result was committed.

## Runnable examples

- [Web Worker](/mapseekai/emap/examples/web-worker/)

## Implementation sources

<span id="core-parameters" />
<span id="more-routing-control" />
<span id="use-your-own-worker-pool" />

- [`src/engine/map/worker-routing.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/worker-routing.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
