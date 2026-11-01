---
id: fit-bounds
slug: /recipes/fit-bounds
title: Fit bounds
description: "Fit the map to data bounds with padding and animation options."
api: ["Emap", "Bounds", "FitBoundsOptions"]
examples: ["getting-started/vector-file", "getting-started/polygon-fill"]
stability: stable
verifiedVersion: unreleased
---

# Fit data bounds

<span id="more-bounds-operations" />

After importing and registering a data source, call `map.fitBounds()` to center and scale the viewport around your data. Always check `bounds.hasBounds()` first so empty layers or uninitialized extents do not move the camera to an invalid state.

## Fit to a single source

Make sure the `source` is loaded and its coordinates match the map's active project CRS. Setting `duration: 0` jumps directly to the data extent on initial load without an introductory pan animation:

```ts
const extent = source.getExtent();
if (extent.hasBounds()) {
  map.fitBounds(extent, { padding: 48, duration: 0 });
}
```

## Fit to a known coordinate array

Use `Bounds.fromArray([xmin, ymin, xmax, ymax])` when fitting to a predefined bounding box. The coordinate values must be expressed in the active project CRS (the example below uses `EPSG:4326` longitude and latitude):

```ts
import { Bounds } from '@mapseekai/emap';

const knownBounds = Bounds.fromArray([116.2, 39.7, 116.6, 40.1]);
if (knownBounds.hasBounds()) map.fitBounds(knownBounds, { padding: 24 });
```

If your application switches to another CRS (such as `EPSG:3857`), transform the bounding coordinates rather than passing degrees into a meter-based projection.

## Handle multiple sources, single points, and sidebars

- **Multiple sources**: Combine the valid `Bounds` of all target sources first, then call `map.fitBounds()` once on the merged extent. Calling `fitBounds()` in a loop over each source will leave the viewport fitted only to the last source.
- **Single points or zero-area bounds**: When both dimensions are zero, `fitBounds()` keeps the current `scale`, subject to an optional `maxScale`. Expand the bounds or set a scale explicitly if you need a particular view.
- **Floating sidebars and panels**: Wait for container layout changes to finish, then pass `padding` (or apply a pixel offset with `panBy()`) so floating UI panels do not cover the fitted geometry.

## Verify the fitted view

Confirm that all four edges of the bounding box remain visible inside the viewport, UI controls do not overlap key features, and empty sources leave the current camera position unchanged. See [Camera](../guides/camera.md) for full camera options.

## API

<span id="core-parameters" />

- `Emap`
- `Bounds`
- `FitBoundsOptions`

## Runnable examples

- [Open a vector file](/mapseekai/emap/examples/getting-started/vector-file/)
- [Polygon fill](/mapseekai/emap/examples/getting-started/polygon-fill/)

## Implementation sources

- [`src/domain/geo/bounds.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/geo/bounds.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
