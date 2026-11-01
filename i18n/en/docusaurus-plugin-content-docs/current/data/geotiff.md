---
id: geotiff
slug: /data/geotiff
title: Local GeoTIFF rasters
description: "Load and style GeoTIFF rasters; configure pyramids, caches, and performance diagnostics."
api: ["openGeoTIFF", "openGeoTIFFHandle", "geoTIFFPlugin", "rasterPlugin", "RasterSource", "RasterStyle", "RasterReference", "RasterContract", "RASTER_PYRAMID_THRESHOLD", "GeoTIFFAddOptions", "GeoTIFFContract", "GeoTIFFPluginOptions", "OpenGeoTIFFOptions", "RasterCacheStats", "RasterPerformanceTotals", "RasterPlanningDiagnostics", "RasterLayerPlanningDiagnostics", "RasterSelectedLevelDiagnostics", "RasterError", "RasterLayerInfo", "RasterLayerReference", "RasterLevel", "RasterMetadata", "RasterBandStatistics", "RasterRenderRequest", "RasterRenderResult", "RasterTaskDiagnostics", "RasterWarpMesh", "RasterProcessingStats", "RasterNativeDeflateStatus", "RasterNativeDeflateDisabledReason", "RasterWorkerBlockStats", "RasterLevelProcessingStats", "RasterReadRequest", "RasterReadResult", "RasterTextureResult", "RasterRenderOptions", "RasterSamples", "RasterWindow", "RenderFrame", "RenderPass"]
examples: ["geotiff-viewer", "mixed-data-viewer", "luma-raster"]
stability: experimental
verifiedVersion: unreleased
---

# Read and display GeoTIFF

<span id="display-and-layer-management" />
<span id="continuous-navigation-display" />
<span id="presentation-cadence-and-read-throughput" />
<span id="parallel-decoding-and-background-colorization" />
<span id="budgets-and-scope" />

`@mapseekai/emap/geotiff` reads tiles and windows on demand from local GeoTIFF or Cloud-Optimized GeoTIFF (COG) files. Rasters are rendered through a dedicated raster presentation stack below vector layers and are never converted into vector topology. Always pass a browser `File` or `FileSystemFileHandle` rather than reading the entire image into an `ArrayBuffer` first.

## 1. Mount raster plugins and add a GeoTIFF file

Install `rasterPlugin()` and `geoTIFFPlugin()` when creating the map, deploy `/assets/emap-geotiff-worker.js`, and pass your `File` (plus an optional external `.ovr` `overviewFile`) to `map.ctx.geoTIFF.addFile()`:

```ts
import { Emap, Bounds } from '@mapseekai/emap';
import { rasterPlugin, geoTIFFPlugin } from '@mapseekai/emap/geotiff';

const map = await Emap.create({
  container: 'map',
  preset: 'viewer',
  plugins: [
    rasterPlugin({ cacheBytes: 64 * 1024 ** 2, concurrency: 2 }),
    geoTIFFPlugin({ workerUrl: '/assets/emap-geotiff-worker.js', workerCount: 2 }),
  ],
});
await map.ctx.geoTIFF.addFile('imagery', file, {
  overviewFile,
  style: { bands: [0, 1, 2], resampling: 'bilinear' },
});
const bounds = await map.ctx.raster.getBounds('imagery');
map.fitBounds(new Bounds(...bounds), { padding: 32, duration: 0 });
```

If there is no external `.ovr` file, pass `overviewFile: undefined`. The raster pipeline can warp between known image and map CRSs, but the source image's CRS must be known or explicitly provided when opening the file.

## 2. Configure bands, stretch ranges, NoData, and pixel queries

Band indexes are zero-based: `bands: [0, 1, 2]` maps the first three bands to RGB, while `bands: [0]` renders a single band in grayscale. Omitting `bands` uses automatic band selection or an embedded palette when available:

```ts
map.ctx.raster.setStyle('imagery', { bands: [0], ranges: [[0, 3000]], opacity: 0.8 });
```

- **Stretch (`ranges`)**: Sets explicit `[min, max]` display limits per band. When omitted, automatic stretch uses source-level band statistics (percentile statistics are approximate). Remember that stretched screen colors are for visualization, not raw radiometric measurements.
- **NoData**: Leaving `nodata: undefined` uses the file's embedded NoData metadata; passing `null` explicitly disables NoData masking.
- **Original pixel queries (`queryPixel()`)**: Call `map.ctx.raster.queryPixel()` to read full-resolution sample values at a map coordinate, and interpret the returned samples alongside the image's CRS, band order, and NoData value.

## 3. Manage raster layer visibility, order, and removal

```ts
map.ctx.raster.setVisibility('imagery', true);
map.ctx.raster.moveLayer('imagery');
```

All raster layers render beneath vector layers. Changing visibility, opacity, or raster ordering never modifies the file on disk, and calling `map.ctx.raster.remove('imagery')` closes active readers and releases cached tiles without deleting the user's local file.

## 4. Large files (`> 2 GiB`), pyramids, and encoding boundaries

<span id="read-large-files-through-pyramids" />

- **Overviews required above 2 GiB (`RASTER_PYRAMID_THRESHOLD`)**: Files larger than 2 GiB require internal pyramid levels or a matching external `.ovr` file so zoomed-out views do not attempt full-resolution reads across the entire extent. Verify that an external `.ovr` matches the base image's georeferencing rather than pairing files by filename similarity alone.
- **Supported geometry and sample types**: The pipeline supports north-up imagery and implemented integer/float sample types (`UInt8`/`16`/`32`, signed integers, floats). Rotated affine transforms, premultiplied alpha, or unsupported palette bit depths require preprocessing before import.
- **Cache budgets**: `cacheBytes` caps managed tile/block caches, not total browser process memory. Measure read, decode, and GPU upload bottlenecks before increasing `concurrency` or `workerCount`.

## 5. Save and restore project references (`toReferences()`)

<span id="project-references-and-privacy" />

`map.ctx.raster.toReferences()` serializes raster layer IDs, styles, and visibility metadata without copying gigabytes of pixel data. When saving a local project:

1. Persist `FileSystemFileHandle` objects separately (for example, in IndexedDB).
2. On reload, re-verify file handle permissions and call `map.ctx.geoTIFF.addHandle()` with the expected source identity.
3. Note that exporting an `.msx` vector project archive does not embed external GeoTIFF files. If a file handle is lost, replaced, or its Worker session resets, prompt the user to reselect or reopen the image rather than silently binding an unrelated file.

## 6. Performance diagnostics and standalone window reads

<span id="public-contracts-and-standalone-reads" />
<span id="performance-diagnostics" />

- **Diagnostics**: `map.ctx.raster.getStats()` includes current cache state, the latest plan, and cumulative `performance` counters. Compare counter deltas around a single interaction. `getProcessingStats(id)` reports file reads, Worker decoding, colorization, and transfer statistics. Measure GPU texture submission and end-to-end latency separately.
- **Standalone window reads**: Use `openGeoTIFF()` and `source.readWindow()` when you need raw sample windows outside a map canvas. Keep window coordinates within the chosen resolution level's dimensions and always call `await source.dispose()` in a `finally` block.

## Implementation sources

<span id="load-a-file" />
<span id="memory-lifecycle-checks" />
<span id="optional-original-texture-layout" />

- [`src/integrations/geotiff/plugin.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geotiff/plugin.ts)
- [`src/integrations/geotiff/source.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geotiff/source.ts)
- [`src/runtime/services/contracts/raster.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/contracts/raster.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
