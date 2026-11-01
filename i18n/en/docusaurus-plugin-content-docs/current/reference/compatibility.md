---
id: compatibility
slug: /reference/compatibility
title: Compatibility
description: "Check browser requirements, rendering backends, peer dependencies, and Worker/WASM deployment."
api: ["RendererBackend", "Emap.getRenderer", "ArcCollection", "ArcCutPoint", "ArcIterator", "ArcVertexData", "ArrowDotPathOptions", "bumpAttributeVersion", "bumpEditVersion", "CanvasPainter", "Coord2", "DataTable", "DefaultMapshaperAdapter", "EditOverlayRenderer", "ExportedFile", "FeatureShape", "GeometryType", "getDefaultMapshaperAdapter", "Handler", "HandlerManager", "HandlerResult", "isHandler", "isPathLayer", "isPointLayer", "LegacyPointShape", "MapshaperAdapter", "MapshaperBBox", "MapshaperDataset", "MapshaperLayer", "MapshaperWorkerPool", "MapshaperWorkerPoolOptions", "NormalizedPointerEvent", "PackedSession", "PathGeometryType", "PathLayer", "PathPart", "PathShape", "PointerModifiers", "PointerMoveEvent", "PointLayer", "PointShape", "PointStyle", "RunnerInputFiles", "SegmentIntersection", "setDefaultMapshaperAdapter", "SignedArcId", "StrokeStyle", "TopologySource.fromBytes", "Transform", "VertexDotStyle", "Emap", "MapOptions", "initParquetWasm", "setParquetWasm", "createDuckDbRuntimeFromJsDelivr"]
examples: ["geoparquet-viewer","web-worker"]
stability: stable
verifiedVersion: unreleased
---

# Environment and compatibility

<span id="bundlers-and-typescript" />
<span id="initparquetwasm-and-setparquetwasm-parameters" />

This reference summarizes the browser version floors, rendering backend requirements, optional peer dependencies, and static Worker/WASM assets declared by `@mapseekai/emap`. Always test your target rendering backend and Worker/WASM asset URLs in your actual deployment environment.

## Browser and toolchain baseline

<span id="core-environment-requirements" />

| Environment | Declared requirement | Role |
| --- | --- | --- |
| Chrome / Edge | `>= 109` | Client browser runtime |
| Firefox | `>= 115` | Client browser runtime |
| Safari | `>= 16.4` | Client browser runtime |
| Node.js | `>= 22.18 < 25` | Local development, builds, and test runners |
| TypeScript | `ES2022` with `DOM` and `DOM.Iterable` | ESM type checking (`moduleResolution: "bundler"`) |

Interactive browser maps require a sized DOM container, `CanvasRenderingContext2D`, `requestAnimationFrame`, and Pointer Events. Optional modules add Web Workers, WebAssembly, or the File System Access API (`FileSystemFileHandle`). Note that the `headless` preset provides a DOM-free browser data workspace, not a Node.js server engine.

## Rendering backends (`renderer`)

| `renderer` option | Environment requirement | Selection behavior |
| --- | --- | --- |
| `'webgl2'` | Browser and GPU with WebGL2 enabled | **Default** when `renderer` is omitted |
| `'canvas2d'` | Standard 2D Canvas support | Explicit selection (`renderer: 'canvas2d'`) |
| `'webgpu'` | Secure context (`https:` or `localhost`) and WebGPU adapter | Explicit selection (`renderer: 'webgpu'`) |

- **No silent fallback**: If the requested GPU backend fails to initialize, `Emap.create()` rejects its Promise rather than silently falling back to `canvas2d`. Catch the rejection and explicitly create a new instance with `renderer: 'canvas2d'` if your application wants automatic fallback.
- **Inspecting or switching backends**: Switching backends requires disposing the current map and creating a new `Emap` instance. Call `map.getRenderer()` to inspect the active backend (returns `null` for `headless`, `empty`, disposed instances, or custom painters without a declared backend). Note that interactive editing handles and overlays still use a 2D Canvas layer even when the main map uses `webgl2` or `webgpu`.

## Peer dependency configuration

<span id="peer-dependency-configuration" />

Install optional peer dependencies only for the subpath entry points your application imports (check `package.json` `peerDependencies` when upgrading):

| Subpath / capability | Required peer dependencies |
| --- | --- |
| Root type declarations and `@mapseekai/emap/maplibre` | `maplibre-gl` `^6.4.1` |
| `@mapseekai/emap/arrow` (Arrow / GeoArrow) | `apache-arrow` `^17.0.0` |
| `@mapseekai/emap/arrow` (GeoParquet) | `apache-arrow` `^17.0.0`, `parquet-wasm` `^0.7.1` |
| `@mapseekai/emap/duckdb` | `@duckdb/duckdb-wasm` `1.33.1-dev64.0`, `apache-arrow` `^17.0.0` |

Installing `maplibre-gl` satisfies TypeScript types, but rendering an online basemap still requires mounting `mapLibrePlugin`. See [Installation](../getting-started/installation.md) for `tsconfig.json` setup.

## Worker and WASM asset deployment

<span id="worker-and-wasm-assets" />
<span id="worker-parameters-in-mapoptions" />
<span id="deployment-configuration" />

| Feature | Static assets to deploy and verify |
| --- | --- |
| Mapshaper background operations (`useWorker`) | `emap-worker.js` and `mapshaper-vendor.js` (in the same directory) |
| GPU text labels (`msdfWorkerUrl`) | `emap-msdf-worker.js` and the `msdf/` font assets directory |
| GPU geometry preparation (`geometryWorkerUrl`) | `emap-geometry-worker.js` |
| Local GeoTIFF rasters (`/geotiff`) | `emap-geotiff-worker.js` |
| GeoPackage import (`/geopackage`) | `emap-geopackage-worker.js`, vendor script, and `sql-wasm.wasm` |
| GeoParquet (`/arrow`) | `parquet-wasm` `.wasm` binary (or explicit module injection via `setParquetWasm`) |
| DuckDB (`/duckdb`) | DuckDB Worker, `.wasm` bundle, and lazy-loaded spatial extension |

All Worker scripts, vendor bundles, and WASM binaries must match the exact version of `@mapseekai/emap`. In production deployments, verify base path prefixes, `application/javascript` and `application/wasm` MIME types, CORS headers, and Content Security Policy (`worker-src`, `script-src`, `connect-src`). Always inspect actual response bodies in your network tab: SPA rewrite rules can return an HTML fallback page with HTTP status `200`, causing Worker or WASM initialization to fail.

## Deployment verification checklist

Type checking and bundler builds do not verify GPU context creation, Worker script loading, or WASM execution. Always run an end-to-end smoke test (file import, rendering, and one Worker operation) in your staging or production preview environment. See [Web Workers](../guides/worker.md).

## API

<span id="browser-version-floors" />
<span id="core-browser-apis" />
<span id="choose-a-backend-when-creating-a-map" />
<span id="mapshaperworkerpool-parameters" />

- [src.MapOptions](/mapseekai/emap/api/interfaces/emap.MapOptions.html)
- [src.MapshaperWorkerPool](/mapseekai/emap/api/classes/emap.MapshaperWorkerPool.html)
- [src_arrow.initParquetWasm](/mapseekai/emap/api/functions/arrow.initParquetWasm.html)

## Runnable examples

- [geoparquet-viewer](/mapseekai/emap/examples/geoparquet-viewer/)
- [web-worker](/mapseekai/emap/examples/web-worker/)

## Implementation sources

- [`package.json`](https://github.com/mapseekai/emap/blob/master/package.json)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
