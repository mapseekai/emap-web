---
id: faq
slug: /reference/faq
title: FAQ
description: "Troubleshoot map display, data loading, format plugins, and background processing."
api: ["Emap", "MapOptions", "TopologySource", "SourceLoadError"]
examples: ["geoparquet-viewer","web-worker"]
stability: stable
verifiedVersion: unreleased
---

# Troubleshooting

Locate your symptom below and follow the verification steps in order. Keep original input files and error diagnostics intact while debugging rather than masking root causes with blind retries.

## The DOM container exists, but the map canvas is blank

<span id="how-do-i-set-up-map-display" />

1. **Check container dimensions**: Confirm the container is mounted in the DOM and has a non-zero width and height in CSS.
2. **Check the container ID string**: Pass `container: 'map'` (the element ID), not `'#map'`.
3. **Catch initialization errors**: `await Emap.create()` rejects if `webgl2` (the default backend) or `webgpu` cannot initialize on the device. Catch the rejection and test with `renderer: 'canvas2d'`. See [Installation](../getting-started/installation.md) and [Compatibility](./compatibility.md).

## The map renders, but imported features do not appear

<span id="core-questions" />
<span id="more-data-formats" />

1. **Await parsing and registration**: Ensure both `TopologySource.fromBytes()` (or `fromUrl()`) and `await map.addSource()` (or `confirmSource()`) have resolved before adding layers.
2. **Verify IDs**: Check that `layer.source` matches the registered source ID and `'source-layer'` matches an existing data-layer name in `source.getLayers()`.
3. **Check visibility and bounds**: Verify layer visibility (`'visible'`), paint opacity, display filters, and call `map.fitBounds(source.getExtent())` after confirming `bounds.hasBounds()`. See [Sources and layers](../concepts/source-layer.md).

## Features appear in the wrong place or measurements fail

1. **Check CRS alignment**: Verify the source file's CRS, the map's active project CRS, and `[longitude, latitude]` vs. `[x, y]` coordinate order.
2. **Do not confuse `project()` with CRS reprojection**: `map.project()` converts between project CRS coordinates and canvas pixels; use `await map.reproject()` or `map.ops.projectLayer()` to transform between EPSG coordinate systems.
3. **Use preflight for missing CRS metadata**: Run `map.preflightSource()` to collect missing `sourceCrs` definitions before registering data. See [Coordinates and CRS](../concepts/coordinates-crs.md).

## Selected features cannot be edited or dragged

1. **Check the active preset and target layer**: Ensure the map uses the `'editor'` preset (or has editing plugins installed) and that the handler's `source` and `sourceLayer` point to an editable data layer (`map.createLayer()` creates a data layer; `map.addLayer()` only adds a visual style).
2. **Check for stale `FeatureRef` indexes**: Operations that delete, merge, or replace features can change positional `id` indexes; refresh your selection from current data.
3. **Disable competing handlers**: Disable other active selection or drawing handlers and ensure no unclosed transaction is blocking mutations. See [Editing](../guides/editing.md).

## Mutating `feature.properties` does not update the map

<span id="more-background-processing" />

`feature.properties` is a frozen read-only snapshot, and `source.getDataset()` is a read-only live view. Direct property assignment does not trigger redraws or record undo history. Use `map.attributes.setFeatureProperties()` or `map.ops`, check `result.ok`, and refresh your UI panel. See [Attributes](../data/attributes.md).

## Workers or WASM fail after deploying to production

Inspect the browser Network tab for the Worker and WASM URLs:

1. Confirm that base path prefixes, CORS headers, and CSP directives (`worker-src`, `script-src`, `connect-src`) allow loading the assets.
2. Inspect the **response body and MIME type**, not just HTTP `200`: SPA fallback routing often returns `index.html` (`text/html`) for missing `.js` or `.wasm` paths.
3. Ensure all Worker scripts, `mapshaper-vendor.js`, and WASM binaries come from the exact same `@mapseekai/emap` build. See [Web Workers](../guides/worker.md).

## Exporting a filtered layer still includes hidden features

A render layer's `filter` property only controls canvas drawing and pointer picking; it does not remove records from the underlying `TopologySource`. To export a subset of features, run a data filter operation or extract the subset before calling `source.export()`. See [Data formats](../data/formats.md).

## Large files cause slow imports or frame drops

<span id="how-do-i-load-my-own-file" />

Isolate whether time is spent in file reading, parsing, spatial processing, GPU upload, or frame rendering:

- Enforce byte and ZIP limits on uploads, select only needed GeoPackage tables, and use windowed GeoTIFF reads with pyramid overviews (`.ovr`) for rasters larger than 2 GiB.
- Enable `useWorker: 'auto'` for heavy Mapshaper commands and tune `geometryLod` for dense vector paths. See [Performance](../recipes/performance.md).

## Calling methods in Vue 3 throws `Cannot read private member` or `Context is destroyed`

**Root cause**: Vue 3's deep reactivity (`ref(map)` or `reactive({ map })`) wraps the object in a JavaScript `Proxy`. Because `Emap` contains native ECMAScript private fields (`#field`) and Cordis dependency-injection contexts, deep Proxy wrapping intercepts private member accesses and breaks internal method bindings.

**Solution**: In Vue 3, **always use `shallowRef` or `markRaw`** when holding map instances:

```ts
import { shallowRef } from 'vue';
import type { Emap } from '@mapseekai/emap';

const map = shallowRef<Emap | null>(null);
```

## React StrictMode mounts the map twice or triggers duplicate canvas errors

**Root cause**: In development mode, React 18 / 19 StrictMode deliberately unmounts and remounts components once to verify effect cleanup. If the first asynchronous `Emap.create()` completes after unmount, or if `map.dispose()` is omitted from the cleanup function, multiple canvas contexts can overlap.

**Solution**: Handle cancelled creation and serialize asynchronous creation and disposal before reusing the container. See [Installation: React integration](../getting-started/installation.md#react-18--19-and-nextjs).

## Resizing the browser or toggling sidebars stretches or blurs the map

**Root cause**: When layout changes (collapsible sidebars, modal displays, split-screen handles) resize the map container's CSS dimensions, the Canvas drawing buffer retains its previous dimensions until refreshed.

**Solution**: Observe the container element using `ResizeObserver` and invoke `map.resize()`:

```ts
const observer = new ResizeObserver(() => {
  map.resize();
});
observer.observe(containerElement);
```

## API

<span id="how-do-i-display-a-specific-layer" />
<span id="more-error-handling" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [TopologySource](/mapseekai/emap/api/classes/emap.TopologySource.html)
- [SourceLoadError](/mapseekai/emap/api/classes/emap.SourceLoadError.html)

## Runnable examples

- [GeoParquet viewer](/mapseekai/emap/examples/geoparquet-viewer/)
- [Web Worker](/mapseekai/emap/examples/web-worker/)

## Implementation sources

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
