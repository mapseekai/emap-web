---
id: performance
slug: /recipes/performance
title: Performance
description: "Configure geometry LOD, Workers, and cache budgets, and distinguish CPU, GPU, and memory diagnostics."
api: ["Emap", "Emap.setGeometryLod", "Emap.setScreenPathFiltering", "MapOptions", "SimplifyOptions"]
examples: ["simplify", "simplify-control", "web-worker", "point-lod", "geometry-lod", "luma-benchmark"]
stability: stable
verifiedVersion: unreleased
---

# Diagnose and improve performance

<span id="interaction-updates-and-data-reuse" />
<span id="render-behavior-and-budget" />
<span id="luma-gpu-real-data-benchmark-and-optional-point-aggregation" />
<span id="snapshot-navigation-and-conservative-path-culling" />
<span id="source-cores-gpu-halo-reuse-and-local-folders" />
<span id="geometry-cache-and-batch-efficiency" />
<span id="valid-stroke-instances-and-direct-upload-buffer-pages" />
<span id="ordered-command-reuse-and-page-recycling" />
<span id="lossless-stroke-layouts-and-dependency-invalidation" />
<span id="resident-stroke-bounds-and-selected-range-batching" />

Before tuning configuration flags, identify which stage dominates latency: file reading and parsing, spatial processing, GPU geometry preparation, or frame rendering. Total vertex count, attribute column width, device pixel ratio (DPR), and GPU capability often matter more than raw feature count alone.

## 1. Establish a reproducible baseline

Keep the dataset, camera position, viewport dimensions, DPR, rendering backend, display filters, and cache state fixed while measuring. Separate your measurements into distinct phases:

1. **Cold import and first frame**: File read, parsing, initial triangulation/upload, and first complete draw.
2. **Steady-state navigation**: Continuous panning and zoom settling after GPU buffers are warm.
3. **Single committed edit**: Latency from pointer release or command invocation to updated render and history state.

Note that CPU command submission time is not identical to GPU frame completion time. Always record the hardware, browser, viewport size, and dataset metrics alongside benchmark numbers.

## 2. Reduce import and processing overhead

- **Bound inputs early**: Enforce `resourceLimits` and `zipLimits` before reading huge files, select only needed tables when importing GeoPackage files, and project only required columns in DuckDB GeoParquet queries.
- **Use windowed raster reads**: Pass `File` or `FileSystemFileHandle` objects to the GeoTIFF service with internal pyramids or `.ovr` overviews rather than decoding entire rasters into memory.
- **Offload heavy Mapshaper commands**: Set `useWorker: 'auto'` so high-vertex operations run in a background Worker without blocking pointer interaction (remember that Worker transfers and undo snapshots still consume memory; see [Web Workers](../guides/worker.md)).

## 3. Choose the right rendering backend and Worker helpers

<span id="full-detail-line-rendering" />

- **`webgl2` (default)**: Recommended for large vector datasets and interactive editing.
- **`canvas2d`**: Useful as a compatibility baseline or for lightweight views on constrained devices.
- **`webgpu`**: Available for explicit opt-in on supported browsers and secure contexts.

GPU geometry preparation (`geometryWorkerUrl`) and MSDF label atlas generation (`msdfWorkerUrl`) are configured independently of Mapshaper's `useWorker`. Separate cold-start upload costs (triangulation, shader compilation, font atlas generation) from steady-state frame timing.

## 4. Tune display LOD vs. data simplification

<span id="display-arc-lod" />

Distinguish visual level-of-detail (which affects only rendering) from data simplification (which changes the workspace's retained simplification threshold):

| Option or API | Effect | Mutates source data? |
| --- | --- | --- |
| `geometryLod` (`setGeometryLod`) | Chooses arc display detail by pixel tolerance (`0 < pixelTolerance <= 64`, default `0.5`; `false` disables) | No |
| `pointLod` | Thins dense points by grid, keeping original points as representatives rather than computing cluster centroids | No |
| `screenPathFiltering` (`setScreenPathFiltering`) | Deduplicates sub-half-device-pixel segments on opaque paths (disabled by default) | No |
| `map.ops.simplifyLayer()` | Computes vertex thresholds and changes the retained simplification state | **Yes** (affects subsequent analysis and exports; original arc vertices remain stored) |

Disabling `geometryLod` does not change the data-level simplification threshold. Undo `simplifyLayer()` or run it again with a different threshold to change that state.

## 5. Manage memory and caches

<span id="dynamic-raster-memory-diagnostics" />
<span id="formal-webgl2--webgpu-navigation-and-preparation-caches" />
<span id="binary-batches-and-stable-stroke-caches" />

Browser process memory includes CPU dataset structures, GPU vertex/texture buffers, Worker transfer buffers, raster block caches, and undo snapshots. A cache budget parameter (such as `cacheBytes` on `rasterPlugin`) caps that managed cache, not total browser tab RSS.

When inspecting raster performance via `getStats()`, compare before-and-after counter deltas for a single interaction, and do not sum parallel Worker task durations as if they were wall-clock latency. Always `await map.dispose()` before mounting a replacement map so old and new GPU/Worker allocations do not overlap.

## 6. Verify each optimization

<span id="more-optimization" />

Change one setting at a time against your baseline and verify visual accuracy, feature picking, selection, and undo/redo alongside frame timing.

## API

<span id="core-parameters" />
<span id="more-worker-configuration" />
<span id="simplifyoptions" />
<span id="screen-pixel-deduplication" />
<span id="viewport-culling-parameters" />
<span id="more-dense-point-lod" />
<span id="pointlod-parameters" />
<span id="near-to-far-cache-recovery" />
<span id="dynamic-uint16-raster-comparison" />
<span id="dynamic-raster-zoom-refinement" />
<span id="full-geopackage-browser-stress-test" />
<span id="bounded-geometry-microbatches" />

- `Emap`
- `MapOptions`
- `SimplifyOptions`

## Runnable examples

<span id="canvas-screen-filtering-in-the-luma-examples" />

- [Web Worker](/mapseekai/emap/examples/web-worker/)
- [Simplify control](/mapseekai/emap/examples/simplify-control/)
- [Geometry simplification](/mapseekai/emap/examples/simplify/)
- [Dense point LOD](/mapseekai/emap/examples/point-lod/)
- [luma WebGL2 Benchmark](/mapseekai/emap/examples/luma-benchmark/)

## Implementation sources

- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
- [`src/engine/map/worker-routing.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/worker-routing.ts)
- [`src/runtime/services/contracts/raster.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/contracts/raster.ts)
