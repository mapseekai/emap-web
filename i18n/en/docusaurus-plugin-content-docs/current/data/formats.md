---
id: formats
slug: /data/formats
title: Data formats
description: "Select vector formats, import and export datasets, and register format plugins."
api: ["buildGeoMetadata", "crsStringToProjjson", "DatasetFormatPlugin", "decodeWkb", "detectGeometryColumn", "Emap", "ExportedFormatFile", "exportGeoArrow", "ExportGeoArrowOptions", "exportGeoParquet", "ExportGeoParquetOptions", "fromArrowTable", "FromArrowTableOptions", "GeoColumnMetadata", "GeoEncoding", "GeoMetadata", "GeometryColumnInfo", "importGeoArrow", "ImportGeoArrowOptions", "importGeoParquet", "ImportGeoParquetOptions", "initParquetWasm", "InitParquetWasmOptions", "ParquetWasmModule", "ParquetWasmTable", "parseGeoMetadata", "projjsonToCrsString", "registerArrowFormats", "registerFormat", "setArrowTable", "setParquetWasm", "toArrowTable", "toArrowTableFromSource", "ToArrowTableOptions", "TopologySource.export", "TopologySource.fromBytes", "TopologySource.fromUrl", "WkbGeometry", "WkbWriter", "TopologySource", "ExportOptions", "TopologySource.setData"]
examples: ["export-formats","getting-started/vector-file","flatgeobuf-viewer","geoparquet-viewer"]
stability: stable
verifiedVersion: unreleased
---

# Import and export formats

<span id="more-formats-and-plugins" />
<span id="geoparquet-and-geoarrow" />
<span id="registration-and-lifecycle" />

Emap organizes format support into built-in vector formats, optional format plugins (`@mapseekai/emap/arrow` and `@mapseekai/emap/geopackage`), custom application codecs (`DatasetFormatPlugin`), and windowed raster services (`@mapseekai/emap/geotiff`).

## Format support matrix

| Format | Entry point | Scope and notes |
| --- | --- | --- |
| GeoJSON, TopoJSON | Built into `TopologySource` | Standard vector import and export |
| Shapefile (`.zip`), KML | Built into `TopologySource` | Shapefile ZIP requires matching `.shp`/`.dbf` entries and respects `zipLimits` |
| MSX | Built into `TopologySource` | Emap project archive for vector topology (does not embed external GeoTIFF pixel files) |
| Arrow, GeoArrow, GeoParquet | `@mapseekai/emap/arrow` | Requires `apache-arrow` (and `parquet-wasm` for GeoParquet) |
| GeoPackage (`.gpkg`) | `@mapseekai/emap/geopackage` | Imports vector feature tables via Worker and SQL.js WASM |
| GeoTIFF / COG | `@mapseekai/emap/geotiff` | Windowed raster reading outside vector topology |
| FlatGeobuf or custom formats | Custom `DatasetFormatPlugin` | Registered by the application via `registerFormat()` |

Note that format conversion is not guaranteed to be a lossless round trip across every schema feature: verify Z/M coordinates, 64-bit integer or binary fields, multi-layer packaging, and CRS metadata when exporting to another format.

## Import vector bytes or URLs

Pass the filename (`filename`) and the map's format registry (`formats: map.formats`) when calling `TopologySource.fromBytes()` so Emap can select the matching parser:

```ts
import { TopologySource } from '@mapseekai/emap';

const source = await TopologySource.fromBytes('upload', bytes, {
  filename: file.name,
  formats: map.formats,
});
await map.addSource('upload', source);
```

- Use `TopologySource.fromUrl(id, url, options)` to fetch and parse a remote vector file.
- See [File import](../recipes/file-upload.md) for configuring `resourceLimits`, `zipLimits`, and `map.preflightSource()` CRS checks.
- Calling `source.setData()` replaces the source's dataset in place; handle rejected Promises and refresh any feature references (`FeatureRef`) held by your UI.

## Register optional or custom format plugins

<span id="core-formats" />

Mount optional format plugins on `map.ctx` and await activation **before** creating a `TopologySource`:

```ts
import { arrowFormatsPlugin } from '@mapseekai/emap/arrow';
const fiber = map.ctx.plugin(arrowFormatsPlugin);
await fiber.await();
```

- **GeoParquet**: In addition to `arrowFormatsPlugin`, initialize Parquet WASM via `initParquetWasm()` or `setParquetWasm()`. For SQL filtering over GeoParquet bytes, see [DuckDB toolbox](./duckdb.md).
- **Custom codec (`DatasetFormatPlugin`)**: Implement `name`, `extensions`, `importBinary`, and `exportFormats` (an empty object when export is unsupported), then register it with `registerFormat(map.formats, codec)` or inside a Cordis plugin `ctx.effect()`. Validate input byte size, coordinate finiteness, and structure inside your custom importer.

## Export a source to a `Blob`

Call `await source.export({ format })` to serialize a source into a `Blob` without altering the original file on disk:

```ts
const blob = await source.export({ format: 'geojson' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'districts.geojson';
link.click();
URL.revokeObjectURL(url);
```

Keep in mind that a render layer's visual `filter` does **not** filter `source.export()`. If you want to export only a subset of features, filter or extract the target data layer first.

## CRS and project restoration notes

- When importing files without embedded CRS metadata, use [source preflight](../concepts/source-layer.md#confirm-crs-while-loading) to collect the CRS before confirming registration.
- When saving and reopening projects that include local GeoTIFF rasters, store `RasterReference` metadata alongside `FileSystemFileHandle` permissions; see [Local GeoTIFF rasters](./geotiff.md).

## API

<span id="core-methods" />
<span id="loading-data" />
<span id="exporting-data" />
<span id="format-notes" />
<span id="geojson-topojson-kml" />
<span id="shapefile-zip" />
<span id="flatgeobuf" />
<span id="geopackage" />
<span id="advanced-format-registration" />
<span id="format-plugin-contract" />
<span id="developing-a-format-plugin" />

- [TopologySource](/mapseekai/emap/api/classes/emap.TopologySource.html)
- [ExportOptions](/mapseekai/emap/api/interfaces/emap.ExportOptions.html)
- [registerFormat](/mapseekai/emap/api/functions/emap.registerFormat.html)
- [DatasetFormatPlugin](/mapseekai/emap/api/interfaces/emap.DatasetFormatPlugin.html)
- [initParquetWasm](/mapseekai/emap/api/functions/arrow.initParquetWasm.html)
- [setParquetWasm](/mapseekai/emap/api/functions/arrow.setParquetWasm.html)

## Runnable examples

- [Export formats](/mapseekai/emap/examples/export-formats/)
- [FlatGeobuf viewer](/mapseekai/emap/examples/flatgeobuf-viewer/)
- [GeoParquet viewer](/mapseekai/emap/examples/geoparquet-viewer/)
- [Open a vector file](/mapseekai/emap/examples/getting-started/vector-file/)

## Implementation sources

- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
- [`src/domain/source/format-registry.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/format-registry.ts)
- [`package.json`](https://github.com/mapseekai/emap/blob/master/package.json)
