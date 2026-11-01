---
id: file-upload
slug: /recipes/file-upload
title: File import
description: "Import browser-selected vector files with byte and ZIP extraction limits."
api: ["TopologySource.fromBytes", "TopologySource", "TopologySourceFromBytesOptions"]
examples: ["flatgeobuf-viewer", "geoparquet-viewer", "getting-started/points"]
stability: stable
verifiedVersion: unreleased
---

# Import a selected file

<span id="more-import-options" />

To import a user-selected vector file safely, validate `file.size` before reading bytes into memory, configure byte and ZIP extraction limits on `TopologySource.fromBytes()`, and run `map.preflightSource()` to verify the CRS before adding render layers.

## 1. Read bytes with resource and ZIP limits

The helper below reads a file from an `<input type="file">` element, enforces a 50 MiB application budget, and runs source preflight (for local GeoTIFF rasters, use window-based reading in [Local GeoTIFF rasters](../data/geotiff.md) instead of reading the whole file into an `ArrayBuffer`):

```ts
import { TopologySource, type Emap } from '@mapseekai/emap';

async function importFile(map: Emap, input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file) return;
  const maxInputBytes = 50 * 1024 * 1024;
  if (file.size > maxInputBytes) throw new Error('File exceeds the 50 MiB limit');
  const source = await TopologySource.fromBytes('upload', await file.arrayBuffer(), {
    filename: file.name,
    formats: map.formats,
    resourceLimits: { maxInputBytes },
    zipLimits: {
      maxCompressedBytes: maxInputBytes,
      maxBytes: 200 * 1024 * 1024,
      maxEntries: 1000,
      maxRatio: 100,
    },
  });
  return map.preflightSource({ id: 'upload', source });
}
```

- **Why check `file.size` first**: Rejecting oversized files before `await file.arrayBuffer()` avoids allocating a large buffer for an input that will be rejected anyway.
- **Why set `zipLimits`**: Compressed archives (such as Shapefile `.zip` bundles) can expand to many times their compressed size. `maxBytes`, `maxEntries`, and `maxRatio` protect the browser tab from ZIP bomb expansion.

## 2. Confirm CRS preflight and add layers

Call `importFile()` inside a `try/catch` block and branch on the returned `SourcePreflightResult`:

- **`status === 'ready'`**: Call `await map.confirmSource(result.plan)`, retrieve the source with `map.getSource('upload')`, then inspect its `getLayers()`, add render layers, and fit bounds.
- **`status === 'needs-input'`**: Prompt the user to specify the missing `sourceCrs` and resubmit `result.draft` (see [Sources and layers](../concepts/source-layer.md)).
- **`status === 'rejected'`**: Display `result.diagnostics` to the user and leave the existing map state untouched.

When importing multiple files over time, either generate a unique source ID per upload or explicitly remove the previous source before reusing `'upload'`.

## 3. Support optional formats

- **Arrow / GeoParquet**: Mount `arrowFormatsPlugin` on `map.ctx` and initialize Parquet WASM before calling `fromBytes(..., { formats: map.formats })`.
- **Shapefile ZIP**: Ensure the archive contains matching `.shp`, `.shx`, and `.dbf` members; if `.prj` is absent, preflight will return `needs-input` so the user can supply the CRS.
- **GeoPackage (`.gpkg`)**: See [GeoPackage import](../data/geopackage.md) for Worker, SQL.js WASM, and table selection options.

## 4. Verify edge cases

Test your upload flow against cancelled file dialogs, empty files, files exceeding `maxInputBytes`, archives missing `.prj`, duplicate source IDs, and component unmount during an in-flight upload.

## API

<span id="core-parameters" />
<span id="topologysourcefrombytesid-bytes-options" />
<span id="replace-source-data" />
<span id="create-a-reusable-source" />

- `TopologySource`
- `TopologySourceFromBytesOptions`

## Runnable examples

- [GeoParquet viewer](/mapseekai/emap/examples/geoparquet-viewer/)
- [FlatGeobuf viewer](/mapseekai/emap/examples/flatgeobuf-viewer/)
- [Getting started: points](/mapseekai/emap/examples/getting-started/points/)

## Implementation sources

- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
- [`src/engine/map/source-loading.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/source-loading.ts)
