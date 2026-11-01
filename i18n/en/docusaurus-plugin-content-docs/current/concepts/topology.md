---
id: topology
slug: /concepts/topology
title: Topology model
description: "Understand shared arcs, read-only dataset views, and topology editing."
api: ["ReadonlyArcCollection", "ReadonlyArcVertexData", "ReadonlyCoord2", "ReadonlyDataTable", "ReadonlyFeatureShape", "ReadonlyMapshaperDataset", "ReadonlyMapshaperLayer", "ReadonlyNumericArray", "ReadonlyPathPart", "ReadonlyPathShape", "ReadonlyPointShape", "TopologySource", "ArcCollection", "MapshaperDataset"]
examples: ["rebuild-topology","vertex-editing","simplify"]
stability: stable
verifiedVersion: unreleased
---

import DocsDiagram from '@site/src/components/DocsDiagram';

# Topology model

In Emap, line and polygon features do not store duplicate coordinate arrays for shared boundaries. Instead, paths reference indexed **arcs** in a shared `ArcCollection` (while point features store `[x, y]` coordinates directly). When two adjacent polygons share a boundary arc, moving a vertex on that arc updates both polygons simultaneously without opening gaps or overlaps.

## How datasets store geometry and attributes

A `MapshaperDataset` inside a `TopologySource` consists of data layers (`layers`), a shared arc table (`arcs`), and metadata (`info`):

- Within each data layer, geometry shapes (`shapes`) and attribute records (`data`) correspond one-to-one by zero-based feature index. A feature can have an empty geometry (`null`) while retaining its attribute record.
- Each line or polygon path is an ordered list of signed arc IDs (`SignedArcId`). A non-negative integer `i` traverses arc `i` forward; a negative integer `~i` (bitwise complement) traverses arc `i` in reverse. Most application code can use `map.features` without decoding arc complements manually.

```ts
const dataset = source.getDataset();
const layers = source.getLayers();
const arcs = source.getArcs();
console.log(layers.length, arcs?.getPointCount?.(), dataset?.info);
```

`getDataset()`, `getLayers()`, and `getArcs()` expose read-only references without deep-copying the underlying data. In-place edits may change what an existing reference shows, while replacing the dataset can leave that reference pointing to old data. Re-read the source for current state and never mutate the underlying arrays directly.

## Shared boundaries during interactive editing

<span id="editing-and-shared-boundaries" />

<DocsDiagram name="shared-arcs" language="en" alt="Adjacent polygons A and B share arc 2: A references 2 forward and B references ~2 in reverse. Moving a shared vertex updates both polygons." />

Because adjacent polygons reference the same arc ID:

- **Vertex editing (`vertexEdit`)**: Dragging a vertex on a shared arc reshapes every feature that references that arc, preserving topological adjacency.
- **Selection transforms (`transformFeature` / `editSession`)**: When translating, rotating, or scaling a selected subset of features, Emap defaults to `splitSharedArcs: true`, which splits arcs shared with unselected neighbors so only the selected features move. Pass `splitSharedArcs: false` when you intentionally want unselected neighboring boundaries to stretch along with the selection (see [Editing](../guides/editing.md)).

## Rebuild topology (`rebuildTopology`)

After importing non-topological geometry or running external coordinate edits, call `map.ops.rebuildTopology()` to recompute arc intersections and shared boundary relationships:

```ts
const result = await map.ops.rebuildTopology({ source: 'districts', noSnap: true });
if (!result.ok) console.error(result.error);
```

- **`noSnap: true`**: Skips automatic vertex snapping before building topology.
- **`snapInterval`**: Expressed in the source's CRS units. Choose `snapInterval` carefully based on your data's precision; an overly large snap distance can collapse narrow corridors or merge distinct vertices. Inspect the result with `checkGeometry` and undo if needed.

## Display LOD vs. dataset simplification

<span id="rendering-and-data-simplification" />

Distinguish display-time arc level-of-detail from dataset simplification:

- **Display LOD (`geometryLod`)**: Simplifies arc rendering on screen for the current zoom level without changing `TopologySource` coordinates or exported files.
- **Data operation (`map.ops.simplifyLayer()`)**: Modifies the dataset's simplification state in workspace memory and affects subsequent spatial operations and exports. Disabling `geometryLod` does not undo a committed `simplifyLayer()` operation. See [Performance](../recipes/performance.md).

## API

<span id="core-structure" />
<span id="more-readonly-queries" />

- [TopologySource](/mapseekai/emap/api/classes/emap.TopologySource.html)
- [MapshaperDataset](/mapseekai/emap/api/interfaces/emap.MapshaperDataset.html)
- [ArcCollection](/mapseekai/emap/api/interfaces/emap.ArcCollection.html)

## Runnable examples

- [Rebuild topology](/mapseekai/emap/examples/rebuild-topology/)
- [Vertex editing](/mapseekai/emap/examples/vertex-editing/)
- [Simplify](/mapseekai/emap/examples/simplify/)

## Implementation sources

- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
- [`src/domain/source/source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/source.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
