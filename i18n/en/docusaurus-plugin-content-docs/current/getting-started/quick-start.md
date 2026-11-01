---
id: quick-start
slug: /getting-started/quick-start
title: Your first map
api: ["Emap", "TopologySource", "LayerSpecification"]
examples: ["getting-started/vector-file"]
stability: stable
verifiedVersion: unreleased
description: "Create, inspect, and release your first Emap map using a complete inline GeoJSON dataset."
---

# Your first map

<span id="4-release-the-map" />

In this tutorial, you will create an interactive map from an inline GeoJSON dataset. By the end, you will have a pannable and zoomable map displaying a green polygon with a dark outline, rendered by two presentation layers that share a single `TopologySource`.

## 1. Prepare the DOM container

Complete [Installation](./installation.md) first. Add a container element with an explicit width and height to your HTML page:

```html
<div id="map" style="width: 100%; height: 480px"></div>
```

When passing a string to `container: 'map'`, provide the element ID directly without a leading `#` selector prefix. You can also pass an `HTMLElement` reference. This tutorial explicitly selects `renderer: 'canvas2d'` so your first run does not depend on GPU environment setup.

## 2. Create the map, register data, and add layers

<span id="1-create-a-container" />
<span id="2-load-data-and-add-layers" />

Run the following code after the `#map` container is mounted in the DOM. GeoJSON coordinates use `[longitude, latitude]` order, and the final coordinate of a polygon ring repeats the first coordinate to close the ring:

```ts
import { Emap, TopologySource } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

const map = await Emap.create({ container: 'map', renderer: 'canvas2d' });
const geojson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'Example area' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[116.35, 39.88], [116.45, 39.88],
        [116.45, 39.96], [116.35, 39.96], [116.35, 39.88]]],
    },
  }],
};
const source = await TopologySource.fromBytes(
  'districts',
  new TextEncoder().encode(JSON.stringify(geojson)),
  { filename: 'districts.geojson' },
);
await map.addSource('districts', source);
map.addLayer({
  id: 'district-fill',
  type: 'fill',
  source: 'districts',
  paint: { 'fill-color': '#47b878', 'fill-opacity': 0.45 },
});
map.addLayer({
  id: 'district-outline',
  type: 'line',
  source: 'districts',
  paint: { 'line-color': '#195533', 'line-width': 1.5 },
});
map.setExtent(source.getExtent());
```

What each step does:

1. `await Emap.create(...)` initializes the map instance and waits for its built-in runtime plugins to become ready.
2. `await TopologySource.fromBytes(...)` parses the GeoJSON bytes into a topology dataset, and `await map.addSource('districts', source)` registers it under the source ID `'districts'`.
3. Two `map.addLayer(...)` calls attach a fill layer (`district-fill`) and an outline layer (`district-outline`) to the same `'districts'` source without duplicating geometry.
4. `map.setExtent(source.getExtent())` fits the camera viewport to the bounding box of the source.

## 3. Verify the result and interaction

<span id="3-check-the-result" />

Open the page in your browser:

- Drag the canvas to pan the map and scroll the mouse wheel to zoom in and out.
- Updating `fill-color` changes the polygon's appearance immediately without re-importing the data.
- If the canvas is blank, first check that `#map` has a non-zero height and inspect the browser console for errors. If the canvas renders but the polygon is missing, verify that `fromBytes()` and `addSource()` were awaited in order and that `layer.source` matches `'districts'`. See [Troubleshooting](../reference/faq.md) for a step-by-step checklist.

## 4. Dispose the map instance

When your component unmounts or the page closes, dispose the map instance and await completion before reusing the DOM container:

```ts
await map.dispose();
```

Next, read [Map and data model](../concepts/overview.md) to understand how sources, layers, and edit history fit together, or follow [File import](../recipes/file-upload.md) to load user-selected local files.

## Implementation sources

<span id="prerequisites" />
<span id="next" />
<span id="runnable-example" />

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
