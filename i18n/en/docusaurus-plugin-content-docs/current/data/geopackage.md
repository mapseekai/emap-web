---
id: geopackage
slug: /data/geopackage
title: Direct GeoPackage vector import
description: "Import GeoPackage vector tables and configure Workers, coordinates, and resource limits."
api: ["importGeoPackage", "importGeoPackageInWorker", "geoPackagePlugin", "ImportGeoPackageOptions", "GeoPackageWorkerOptions", "GeoPackagePluginOptions", "GeoPackageLimits", "GeoPackageProgress", "GeoPackageDataset", "GeoPackageMetadata", "GeoPackageTableMetadata"]
examples: ["geopackage-viewer"]
stability: experimental
verifiedVersion: unreleased
---

# Import GeoPackage

<span id="more-import-paths" />
<span id="import-pipeline" />
<span id="advanced-import-parameters" />

`@mapseekai/emap/geopackage` reads vector feature tables from local `.gpkg` files and converts them into an Emap topology dataset. It is purpose-built for vector feature tables (it is not a general-purpose SQLite query console and does not import raster tile tables as vector layers).

## 1. Standalone import (`importGeoPackage`)

Use `importGeoPackage()` when you want to inspect metadata and layers before registering a source on the map. Make sure `sql-wasm.wasm` is deployed and that `layers` lists valid vector table names in the file:

```ts
import { importGeoPackage } from '@mapseekai/emap/geopackage';

const bytes = await file.arrayBuffer();
const dataset = await importGeoPackage(bytes, {
  wasmUrl: '/assets/sql-wasm.wasm',
  layers: ['roads', 'stations'],
  targetCrs: 'EPSG:3857',
});
```

`importGeoPackage()` returns a parsed `GeoPackageDataset` without creating map sources or render layers automatically.

## 2. Mount as a map format plugin (`geoPackagePlugin`)

<span id="mount-a-native-cordis-format-plugin" />

To integrate `.gpkg` files into the standard `TopologySource` import flow, mount `geoPackagePlugin()` on `map.ctx` and pass `formats: map.formats` to the source. Deploy both `emap-geopackage-worker.js` and `sql-wasm.wasm` from matching builds:

```ts
import { Emap, TopologySource } from '@mapseekai/emap';
import { geoPackagePlugin } from '@mapseekai/emap/geopackage';

const map = await Emap.create({ container: 'map' });
const fiber = map.ctx.plugin(
  geoPackagePlugin({
    workerUrl: '/assets/emap-geopackage-worker.js',
    wasmUrl: '/assets/sql-wasm.wasm',
    layers: ['roads'],
  }),
);
await fiber.await();

const source = new TopologySource('gpkg', { formats: map.formats });
await source.setData({ filename: file.name, content: new Uint8Array(await file.arrayBuffer()) });
await map.addSource('gpkg', source);
```

If `layers` is omitted, Emap imports all supported vector feature tables in the `.gpkg`. For large multi-table databases, explicitly list only the tables you need, then inspect `source.getLayers()` after import to add render layers for each resulting data layer.

## 3. Coordinate reprojection, Z/M handling, and field types

<span id="installation-and-assets" />

- **CRS unification (`targetCrs`)**: Reprojects imported tables into a single target CRS. If a table lacks valid CRS metadata, supply an explicit source CRS definition rather than relabeling coordinates without reprojection.
- **2D editing coordinates**: Emap's topology and editing pipeline operates in 2D (`XY`). Presence of `Z` or `M` ordinates in `.gpkg` geometries does not enable 3D editing.
- **Attribute and geometry conversion**: Safe 64-bit integers remain JavaScript `number` values, integers outside `Number.MAX_SAFE_INTEGER` convert to `string` to prevent precision loss, and `BLOB` columns map to `Uint8Array`. Features with empty geometry can retain their attribute records. Tables containing mixed geometry types may be split by geometry type (`point`, `polyline`, `polygon`), increasing the output data-layer count.

## 4. Worker execution, cancellation, and resource limits

<span id="workers-progress-and-cancellation" />

- **`importGeoPackageInWorker()`**: Supports `signal` (`AbortSignal`) and `onProgress` callbacks. By default, the caller retains ownership of the input buffer; if you set `transferInput: true` for zero-copy transfer, do not reuse the transferred `ArrayBuffer` on the main thread.
- **Resource limits (`limits`)**: Default budgets cap input size and decoded size at `2 GiB`, feature count at `10,000,000`, and output layers at `4096`. These limits reject malformed or oversized inputs early, though actual usable capacity still depends on client device memory.

## 5. Verify imported tables

After import, verify `source.getLayers()` count, feature counts, resolved CRS, and attribute types. If an import fails, check that `emap-geopackage-worker.js` and `sql-wasm.wasm` returned valid JS/WASM responses before debugging table schemas.

## Runnable examples

- [GeoPackage multi-layer example](/mapseekai/emap/examples/geopackage-viewer/)

## Implementation sources

<span id="core-parameters" />
<span id="data-semantics" />
<span id="resource-bounds" />

- [`src/integrations/geopackage/types.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geopackage/types.ts)
- [`src/integrations/geopackage/import.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geopackage/import.ts)
- [`src/integrations/geopackage/worker.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geopackage/worker.ts)
