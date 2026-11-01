---
id: operations
slug: /data/operations
title: Data operations
description: "Run undoable data operations through map.ops and handle cancellation and failures."
api: ["AffineLayerOptions", "ApplyExpressionOptions", "BufferOptions", "CheckGeometryOptions", "CleanOptions", "ClipEraseOptions", "DataFillOptions", "DissolveOptions", "DivideOptions", "DragSessionOptions", "DropLayerOptions", "Emap", "ExplodeOptions", "ExportSnapshotOptions", "ExpressionEvaluationPolicy", "FeatureAffineSession", "FeatureRef", "FeatureTranslateSession", "FilterFieldsOptions", "FilterGeomOptions", "FilterIslandsOptions", "FilterOptions", "FilterSliversOptions", "GeometryCheckReport", "HighlightStyle", "InnerlinesOptions", "IntersectionPointsLayerOptions", "JoinTableData", "JoinTableOptions", "LinesOptions", "LoadSnapshotOptions", "MapOptions", "MergeLayersOptions", "MosaicOptions", "PointsMode", "PointsOptions", "PolygonsOptions", "ProjectLayerExport", "ProjectLayerOutputOptions", "ProjectOptions", "QueriedFeature", "QueryFeaturesOptions", "RebuildTopologyOptions", "RenameFieldsOptions", "RenameLayerOptions", "SimplifyMethod", "SimplifyOptions", "SnapOptions", "SortFeaturesOptions", "SplitCutter", "SplitFeatureHandler", "SplitFeatureOptions", "SplitLayerOptions", "SplitSelectedOptions", "SplitSelectedResult", "UnionOptions", "UniqueFeaturesOptions", "OpResult", "OpError", "ClassifyFeaturesOptions"]
examples: ["buffer","clip","erase","dissolve","filter-features","merge-selected","simplify","split-features","union"]
stability: stable
verifiedVersion: unreleased
---

# Run data operations

<span id="more-operations" />
<span id="more-common-operations" />

`map.ops` runs undoable spatial and attribute processing on workspace data layers. Specify the `source` ID and `target` data-layer ID, `await` the operation, and inspect the returned `OpResult` (`result.ok`) before updating your UI.

## Invoke an operation and inspect `OpResult`

The example below buffers a `roads` data layer inside source `main`. Always verify your active CRS and distance units before running distance-based operations:

```ts
const result = await map.ops.bufferLayer({ source: 'main', target: 'roads', radius: 250 });
if (result.ok) {
  console.log('Buffer completed');
} else {
  console.error(result.error.kind, result.error);
}
```

When `result.ok === true`, the type of `result.value` depends on the operation: in-place workspace mutations typically return `undefined`, whereas inspection commands (`checkGeometry`) return a structured report and export commands (`projectLayer`) return a `Blob` and filename.

## Operation categories at a glance

<span id="operation-parameters" />

| Goal | Representative `map.ops` methods |
| --- | --- |
| Simplify, clean, and inspect geometry | `simplifyLayer`, `cleanLayer`, `checkGeometry`, `filterIslands`, `filterSlivers` |
| Spatial overlay and clipping | `bufferLayer`, `clipLayer`, `eraseLayer`, `unionLayers`, `mosaicLayers` |
| Dissolve, merge, and split | `dissolveLayer`, `mergeLayers`, `splitLayer`, `explodeFeatures` |
| Attribute filtering, joins, and classification | `applyExpression`, `filterFields`, `joinTable`, `classifyFeatures`, `sortFeatures` |
| Export in another CRS | `projectLayer` |
| Rebuild shared topology | `rebuildTopology` |

See the generated API reference for each option interface. Remember that `target`, `mask`, and `divider` refer to **data-layer IDs** resolvable within the operation context, not render-layer IDs.

## In-place workspace mutations vs. standalone outputs

- **In-place workspace mutations**: Most `map.ops` commands update the target source in place and record an entry in `EditHistory`. Because operations such as `dissolveLayer`, `clipLayer`, or `filterFeatures` can change feature counts and order, previously stored feature indexes (`FeatureRef.id`) may no longer point to the same feature. Refresh your UI's feature references after a mutation completes.
- **Detached outputs**: `map.ops.projectLayer()` exports a reprojected file (`Blob`) without changing the map's active CRS or workspace data. Similarly, standalone tools in `@mapseekai/emap/duckdb` return new datasets without automatically replacing map sources or recording undo steps; see [DuckDB toolbox](./duckdb.md).

## Cancellation and concurrent edit detection (`stale-operation`)

<span id="more-calls-and-errors" />
<span id="layer-targeting-and-output" />
<span id="overlay-topology-and-transforms" />
<span id="layers-attributes-and-topology" />
<span id="selection-and-editing" />

- **Bind an `AbortSignal`**: Call `map.ops.withSignal(controller.signal)` to create a cancellable operations facade. After calling `controller.abort()`, still `await` the operation Promise and handle its completion before re-enabling UI buttons.
- **Version checks (`stale-operation`)**: Before committing an asynchronous Worker or DuckDB result, Emap verifies that the target source's data version has not changed since the operation started. If another edit occurred in the meantime, the operation returns `error.kind === 'stale-operation'` rather than overwriting newer data. If the map was disposed while the operation was running, it returns `host-removed`.

## Transactions, expression policy, and Workers

<span id="more-selection-operations-and-history" />

- Wrap multi-step operations in a [transaction](../guides/editing.md#3-group-multiple-operations-in-a-transaction) (`map.beginTransaction()`) to commit or roll them back as a single undo step.
- JavaScript expressions (`applyExpression`, `filterFeatures` with JS expressions) require `expressionPolicy: 'trusted'` at map creation; see [Attributes](./attributes.md).
- To run expensive Mapshaper operations in a background thread, see [Web Workers](../guides/worker.md).

## API

<span id="core-methods" />
<span id="feature-geometry" />
<span id="worker-routing" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [OpResult](/mapseekai/emap/api/types/emap.OpResult.html)
- [OpError](/mapseekai/emap/api/types/emap.OpError.html)
- [BufferOptions](/mapseekai/emap/api/interfaces/emap.BufferOptions.html)
- [SimplifyOptions](/mapseekai/emap/api/interfaces/emap.SimplifyOptions.html)
- [ProjectOptions](/mapseekai/emap/api/interfaces/emap.ProjectOptions.html)
- [ClassifyFeaturesOptions](/mapseekai/emap/api/interfaces/emap.ClassifyFeaturesOptions.html)

## Runnable examples

- [Buffer](/mapseekai/emap/examples/buffer/)
- [Clip](/mapseekai/emap/examples/clip/)
- [Erase](/mapseekai/emap/examples/erase/)
- [Dissolve](/mapseekai/emap/examples/dissolve/)
- [Filter features](/mapseekai/emap/examples/filter-features/)
- [Merge selected features](/mapseekai/emap/examples/merge-selected/)
- [Simplify](/mapseekai/emap/examples/simplify/)
- [Split features](/mapseekai/emap/examples/split-features/)
- [Union](/mapseekai/emap/examples/union/)

## Implementation sources

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/engine/map/op-result.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/op-result.ts)
- [`src/engine/map/ops/project.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/ops/project.ts)
