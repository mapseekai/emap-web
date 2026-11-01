---
id: duckdb
slug: /data/duckdb
title: DuckDB Processing Toolbox
description: "Configure DuckDB-Wasm for SQL, spatial processing, and GeoParquet queries."
api: ["AggregateOptions", "append", "area", "attributeFilter", "AttributeFilterOptions", "attributeJoin", "AttributeJoinOptions", "AttributeOptions", "boundary", "buffer", "BufferOptions", "centroid", "centroidX", "centroidY", "clip", "ClipOptions", "closeDuckDbRuntime", "collect", "convexHull", "createDuckDbGeoParquetQuerySource", "createDuckDbRuntimeFromJsDelivr", "CreateDuckDbRuntimeOptions", "densify", "DensifyOptions", "difference", "DifferenceOptions", "dissolve", "DuckDbAgentMetadata", "duckDbAttributeFilterLayer", "DuckDbAttributeFilterLayerOptions", "DuckDbAttributeFilterLayerResult", "DuckDbConnection", "duckDbGeoParquetQueryLayer", "DuckDbGeoParquetQueryLayerOptions", "DuckDbGeoParquetQueryLayerResult", "DuckDbGeoParquetQueryOptions", "DuckDbGeoParquetQuerySource", "DuckDbMapOpContext", "DuckDbMapOpSource", "DuckDbOperationError", "DuckDbOperationErrorKind", "duckDbOverlayLayer", "DuckDbOverlayLayerOptions", "DuckDbOverlayLayerResult", "DuckDbRuntime", "DuckDbSpatialExtensionUrls", "duckDbSpatialSummaryJoinLayer", "DuckDbSpatialSummaryJoinLayerOptions", "DuckDbSpatialSummaryJoinLayerResult", "duckDbToolbox", "DuckDbToolCategory", "DuckDbToolDefinition", "DuckDbToolExecutionContext", "DuckDbToolId", "DuckDbToolInput", "DuckDbToolObjectProperty", "DuckDbToolOutput", "DuckDbToolParameter", "DuckDbWasmModule", "envelope", "extractVertices", "GeometryOptions", "geometryType", "intersect", "IntersectOptions", "isEmpty", "isSimple", "isValid", "length", "lineToPolygon", "merge", "MergeOptions", "multipartToSinglepart", "near", "nearest", "NearestOptions", "NearOptions", "perimeter", "pointToLine", "PointToLineOptions", "polygonToLine", "queryGeoParquetWithDuckDb", "quoteSqlString", "repairGeometry", "RepairGeometryOptions", "reproject", "ReprojectOptions", "simplify", "SimplifyOptions", "simplifyPreserveTopology", "SpatialAggregation", "spatialFilter", "SpatialFilterOptions", "SpatialFilterPredicate", "spatialJoin", "SpatialJoinOptions", "SpatialJoinPredicate", "spatialRelation", "SpatialRelationOptions", "spatialSummaryJoin", "SpatialSummaryJoinOptions", "SpatialSummaryJoinPredicate", "SpatialSummaryJoinType", "SpatialSummaryOperation", "symmetricDifference", "SymmetricDifferenceOptions", "union", "UnionOptions", "ValidatedDuckDbSelectSql", "ValidatedDuckDbSelectSqlWithoutRowId", "ValidatedDuckDbSelectSqlWithRowId", "validateDuckDbSelectSql", "ValidateDuckDbSelectSqlOptions", "x", "y"]
examples: ["duckdb-buffer","duckdb-geoparquet-query","duckdb-overlay","duckdb-query","duckdb-spatial-aggregate-join"]
stability: stable
verifiedVersion: unreleased
---

# Process spatial data with DuckDB

`@mapseekai/emap/duckdb` runs DuckDB-Wasm and its spatial extension in the browser for SQL queries, GeoParquet filtering, and vector spatial analysis. Standalone DuckDB functions take a dataset and return a new dataset without automatically replacing map sources or adding `EditHistory` entries.

## 1. Initialize and close a `DuckDbRuntime`

<span id="more-runtime-configuration" />

Install the required peer dependencies (`@duckdb/duckdb-wasm` and `apache-arrow`; see [Compatibility](../reference/compatibility.md)). For quick setup with network access, `createDuckDbRuntimeFromJsDelivr()` loads Worker and WASM bundles from jsDelivr; for offline or restricted CSP deployments, pass self-hosted asset URLs via `CreateDuckDbRuntimeOptions`:

```ts
import { createDuckDbRuntimeFromJsDelivr, closeDuckDbRuntime } from '@mapseekai/emap/duckdb';

const runtime = await createDuckDbRuntimeFromJsDelivr();
try {
  // Await all DuckDB operations using runtime here.
} finally {
  await closeDuckDbRuntime(runtime);
}
```

The DuckDB spatial extension is loaded lazily on the first spatial tool call. Always wait for all in-flight queries to finish before calling `await closeDuckDbRuntime(runtime)`.

## 2. Choose an invocation style and verify CRS units

You can invoke DuckDB tools in three ways depending on your architecture:

1. **Direct functions** (`buffer`, `clip`, `spatialJoin`, `attributeFilter`, etc.) when calling a known tool in application code.
2. **`duckDbToolbox`** when discovering tool metadata or dispatching tools dynamically by ID.
3. **Map plugin and workspace helpers** (`duckDbPlugin`, `duckDbOverlayLayer`, `duckDbAttributeFilterLayer`, etc.) when integrating with an `Emap` instance.

```ts
import { buffer } from '@mapseekai/emap/duckdb';

const buffered = await buffer(roads, { distance: 20 }, runtime);
```

**Planar distance rule**: Distance and area tools (`buffer`, `near`, `nearest`, `densify`, `simplify`) reject geographic coordinate systems (such as `EPSG:4326` degrees) by default so angular degrees are never mistaken for meters. Reproject `roads` into an appropriate projected CRS (with known linear units such as meters) before running distance operations.

## 3. Query GeoParquet bytes with scoped SQL

<span id="more-geoparquet-queries" />

`queryGeoParquetWithDuckDb()` executes a validated single-statement `SELECT` query against table `input` backed by GeoParquet bytes:

```ts
import { queryGeoParquetWithDuckDb } from '@mapseekai/emap/duckdb';

const result = await queryGeoParquetWithDuckDb(bytes, {
  sql: 'SELECT geometry, name FROM input WHERE active = true',
}, runtime);
```

- **Scoped SQL contract**: Only a single `SELECT` query over `input` is permitted (`validateDuckDbSelectSql()`). Multi-statement SQL, DDL/DML writes, external file-reading functions, or references to other tables are rejected.
- **Preserve geometry and metadata**: Include the geometry column in your `SELECT` list when producing a spatial dataset, and verify output column names and CRS metadata after custom SQL projections.

## 4. Cancellation, cleanup, and error handling

<span id="duckdbruntimescope-and-duckdbplugin" />
<span id="tool-families-and-key-parameters" />

- **Cancellation**: Pass an `AbortSignal` to cancel a running tool call, and await the rejected/completed call so temporary tables, connections, and virtual files are cleaned up before starting the next query. Cancelling a single query does not close a shared `DuckDbRuntime`.
- **Error mapping**: Standalone tools throw `DuckDbOperationError` (with a structured `kind` such as `'validation'`, `'runtime-unavailable'`, `'spatial-extension-unavailable'`, `'query-failed'`, or `'conversion-failed'`). Map-level wrappers translate these into the `duckdb` branch of `OpError`. See [Errors reference](../reference/errors.md).

## API

<span id="core-methods" />
<span id="createduckdbruntimefromjsdelivr" />
<span id="more-gis-processing" />
<span id="attributefilter-sql-contract" />
<span id="more-toolbox" />
<span id="cancel-one-tool-run" />

- [createDuckDbRuntimeFromJsDelivr](/mapseekai/emap/api/functions/duckdb.createDuckDbRuntimeFromJsDelivr.html)
- [closeDuckDbRuntime](/mapseekai/emap/api/functions/duckdb.closeDuckDbRuntime.html)
- [validateDuckDbSelectSql](/mapseekai/emap/api/functions/duckdb.validateDuckDbSelectSql.html)
- [queryGeoParquetWithDuckDb](/mapseekai/emap/api/functions/duckdb.queryGeoParquetWithDuckDb.html)
- [duckDbToolbox](/mapseekai/emap/api/variables/duckdb.duckDbToolbox.html)

## Runnable examples

- [DuckDB buffer](/mapseekai/emap/examples/duckdb-buffer/)
- [DuckDB GeoParquet query](/mapseekai/emap/examples/duckdb-geoparquet-query/)
- [DuckDB overlay](/mapseekai/emap/examples/duckdb-overlay/)
- [DuckDB query](/mapseekai/emap/examples/duckdb-query/)
- [DuckDB spatial aggregate join](/mapseekai/emap/examples/duckdb-spatial-aggregate-join/)

## Implementation sources

- [`src/integrations/duckdb/index.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/duckdb/index.ts)
- [`src/integrations/duckdb/core/types.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/duckdb/core/types.ts)
