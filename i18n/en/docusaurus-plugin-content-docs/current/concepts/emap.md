---
id: emap
slug: /concepts/emap
title: Emap map instance
description: "Create an Emap instance and manage options, camera, data, and lifecycle."
api: ["Emap", "Feature", "FeatureAccessor", "FeatureQuery", "findInvalidFieldName", "HighlightManager", "isValidFieldName", "VisibleLayerLookup", "MapOptions", "TopologySource"]
examples: ["getting-started/vector-file","interaction-handlers","undo-redo"]
stability: stable
verifiedVersion: unreleased
---

# Emap map instance

An `Emap` instance is the central facade for a map workspace, coordinating data sources, camera state, rendering backends, interactive handlers, and undoable editing. Bind its creation, asynchronous operations, and `await map.dispose()` cleanup to your UI component's lifecycle.

## Initialization and readiness (`Emap.create` vs. `new Emap`)

<span id="events-and-queries" />
<span id="editing-and-data-processing" />

Browser presets (`editor` and `viewer`) require a mounted DOM container with non-zero dimensions. Prefer `await Emap.create(options)`, which constructs the instance and waits for all preset plugins and rendering services to become ready (`new Emap(options)` returns immediately before async plugins finish initializing, requiring you to `await map.ready` manually):

```ts
import { Emap } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

const map = await Emap.create({
  container: 'map',
  preset: 'viewer',
  renderer: 'canvas2d',
});
```

- **Container**: A string `container: 'map'` is resolved by element ID (`document.getElementById('map')`, without a `#` prefix), or you can pass an `HTMLElement` directly.
- **Renderer**: `webgl2` is the default backend. If GPU initialization fails, `Emap.create()` rejects its Promise rather than silently switching backends; your application can catch the rejection and retry with `renderer: 'canvas2d'` if desired (see [Compatibility](../reference/compatibility.md)).

## Primary capability entry points on `Emap`

| Responsibility | Primary methods / properties | Guide |
| --- | --- | --- |
| Register sources and render layers | `addSource`, `preflightSource`, `confirmSource`, `addLayer`, `createLayer` | [Sources and layers](./source-layer.md) |
| Control the camera | `jumpTo`, `easeTo`, `flyTo`, `fitBounds`, `setExtent` | [Camera](../guides/camera.md) |
| Query and select features | `features`, `queryFeatures`, `select`, `clickSelect`, `boxSelect`, `lassoSelect` | [Selection](../guides/selection.md) |
| Edit geometry, attributes, and run operations | `attributes`, `editSession`, `ops`, `beginTransaction`, `undo`, `redo` | [Data operations](../data/operations.md) |
| Extend runtime, controls, and AI tools | `ctx`, `controls`, `capabilities`, `formats` | [Plugins](../guides/plugins.md) |

Always `await` asynchronous methods (`addSource`, `addControl`, `ops.*`, `dispose`) before relying on their side effects.

## Project CRS and coordinate conversion

Each map maintains an active project CRS (`DEFAULT_CRS` is `EPSG:4326`) and validates coordinate consistency when sources enter the workspace:

- Call `map.setCRS()` on an empty map to set the initial project CRS before registering sources, or call `await map.reproject(targetCrs)` to transform already-registered data into a new CRS.
- Call `map.project(x, y)` and `map.unproject(px, py)` to convert between active project coordinates and local canvas pixels. See [Coordinates and CRS](./coordinates-crs.md) and [Events reference](../reference/events.md).

## Teardown and resource ownership (`dispose`)

While `map.remove()` initiates teardown synchronously, `await map.dispose()` waits for all Cordis plugins, controls, and owned Worker tasks to finish cleaning up. Always `await map.dispose()` before reusing the DOM container or mounting a replacement map:

```ts
await map.dispose();
```

If you passed a shared `workerRuntime` into `Emap.create()`, the map borrows that runtime and does not destroy it during `map.dispose()`. Dispose the shared runtime in your host application after all maps using it have been disposed; see [Web Workers](../guides/worker.md).

## API

<span id="core-methods" />
<span id="mapoptions-core-parameters" />
<span id="layerspecification" />
<span id="more-creation-options" />
<span id="crs" />
<span id="camera" />
<span id="lifecycle" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [MapOptions](/mapseekai/emap/api/interfaces/emap.MapOptions.html)
- [TopologySource](/mapseekai/emap/api/classes/emap.TopologySource.html)

## Runnable examples

- [Open a vector file](/mapseekai/emap/examples/getting-started/vector-file/)
- [Interaction handlers](/mapseekai/emap/examples/interaction-handlers/)
- [Undo and redo](/mapseekai/emap/examples/undo-redo/)

## Implementation sources

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/runtime/services/options.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/options.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
