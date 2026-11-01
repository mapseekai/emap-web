---
id: coordinates-crs
slug: /concepts/coordinates-crs
title: Coordinates and CRS
description: "Distinguish map coordinates, Canvas pixels, and CRS; configure coordinates and reprojection."
api: ["AffineTransform", "AnimationOptions", "Bounds", "CameraOptions", "DEFAULT_CRS", "Emap", "FitBoundsOptions", "FlyToOptions", "inferFromPrj", "normalizeCrsString", "Projection", "resolveDatasetCRS", "setDatasetCrsMetadata", "Viewport"]
examples: ["crs-switch","project","duckdb-buffer"]
stability: stable
verifiedVersion: unreleased
---

# Coordinates and CRS

<span id="more-crs-setup" />
<span id="extent-distance-and-units" />
<span id="camera-zoom-and-scale" />

A Coordinate Reference System (CRS) defines what coordinate numbers mean and what units they use (degrees vs. meters). In Emap, dataset geometry and camera centers use the **active project CRS**, while pointer events and screen overlays use **local canvas pixels**. Keeping these spaces distinct prevents positioning and measurement bugs.

## Compare coordinate operations

| Method | Input and output | Mutates dataset geometry? |
| --- | --- | --- |
| `map.project(x, y)` / `map.unproject(px, py)` | Converts between active project CRS coordinates and local canvas pixels | No |
| `map.setCRS(crs)` | Sets the project CRS identifier on an empty map before data is added | No (establishes the workspace coordinate space) |
| `await map.reproject(targetCrs)` | Transforms registered vector datasets and the camera into `targetCrs` | **Yes** (participates in undo history) |
| `await map.ops.projectLayer(options)` | Reprojects a layer into an exported `Blob` file (`ProjectLayerExport`) | No (workspace data and map CRS stay unchanged) |

Note that `map.project()` is a screen-space viewport projection, **not** an EPSG coordinate transformation. Also note that in `FeatureEvent` payloads, the `lngLat` property holds coordinates in the **active project CRS** despite its historical property name; do not assume it is always `[longitude, latitude]` in degrees.

## Establish the project CRS

When importing data, Emap reads embedded CRS metadata (such as `.prj`, GeoParquet metadata, or GeoPackage SRS definitions). The first confirmed source establishes the map's project CRS, and subsequent sources are checked or reprojected to align with it. You can also set the project CRS explicitly before adding any sources:

```ts
map.setCRS('EPSG:3857');
```

Never guess a missing CRS from coordinate magnitudes alone. When a file lacks CRS metadata, use [source preflight](./source-layer.md#confirm-crs-while-loading) (`map.preflightSource()`) to prompt the user for the original `sourceCrs`, and let Emap transform the coordinates properly. Overwriting a CRS label (`setDatasetCrsMetadata`) without transforming coordinates does not reproject geometry.

## Convert between project coordinates and canvas pixels

Use `map.project()` and `map.unproject()` to position custom HTML tooltips or convert canvas pointer positions into map coordinates:

```ts
const [pixelX, pixelY] = map.project(500000, 3400000);
const [mapX, mapY] = map.unproject(pixelX, pixelY);
console.log(mapX, mapY);
```

`pixelX` and `pixelY` are relative to the map canvas element's top-left corner (if you have browser `clientX` / `clientY` coordinates, subtract `container.getBoundingClientRect()` first). Camera `center` options also use project CRS coordinates, and a positive `scale` works uniformly across any CRS (see [Camera](../guides/camera.md)).

## Reproject workspace data or export in another CRS

- **Transform the active workspace**: Call `await map.reproject(targetCrs)` to transform registered vector datasets and the camera view (with undo/redo support).
- **Export a reprojected file without altering the workspace**: Call `await map.ops.projectLayer()` to produce a standalone `Blob`:

```ts
const result = await map.ops.projectLayer({
  source: 'districts', target: 'districts', crs: 'EPSG:3857',
  output: { format: 'geojson', filename: 'districts-3857.geojson' },
});
if (!result.ok) console.error(result.error);
else console.log(result.value.blob, result.value.filename);
```

Keep in mind that standard RFC 7946 GeoJSON consumers expect `EPSG:4326` (`[longitude, latitude]`); export `EPSG:3857` GeoJSON only when downstream tools explicitly expect projected coordinates. Similarly, check CRS unit requirements before running spatial analysis: DuckDB planar distance tools reject geographic CRSs (`EPSG:4326`) by default so degrees are not treated as meters.

## API

<span id="core-methods" />
<span id="more-reprojection" />
<span id="more-coordinate-spaces" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [Bounds](/mapseekai/emap/api/classes/emap.Bounds.html)
- [AffineTransform](/mapseekai/emap/api/classes/emap.AffineTransform.html)
- [Projection](/mapseekai/emap/api/classes/emap.Projection.html)
- [Viewport](/mapseekai/emap/api/classes/emap.Viewport.html)
- [CameraOptions](/mapseekai/emap/api/interfaces/emap.CameraOptions.html)
- [AnimationOptions](/mapseekai/emap/api/interfaces/emap.AnimationOptions.html)
- [FitBoundsOptions](/mapseekai/emap/api/interfaces/emap.FitBoundsOptions.html)
- [FlyToOptions](/mapseekai/emap/api/interfaces/emap.FlyToOptions.html)
- [DEFAULT_CRS](/mapseekai/emap/api/variables/emap.DEFAULT_CRS.html)
- [resolveDatasetCRS](/mapseekai/emap/api/functions/emap.resolveDatasetCRS.html)
- [normalizeCrsString](/mapseekai/emap/api/functions/emap.normalizeCrsString.html)
- [inferFromPrj](/mapseekai/emap/api/functions/emap.inferFromPrj.html)
- [setDatasetCrsMetadata](/mapseekai/emap/api/functions/emap.setDatasetCrsMetadata.html)

## Runnable examples

- [CRS switch](/mapseekai/emap/examples/crs-switch/)
- [Project](/mapseekai/emap/examples/project/)
- [DuckDB buffer](/mapseekai/emap/examples/duckdb-buffer/)

## Implementation sources

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/geo/projection.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/geo/projection.ts)
- [`src/engine/map/ops/project.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/ops/project.ts)
