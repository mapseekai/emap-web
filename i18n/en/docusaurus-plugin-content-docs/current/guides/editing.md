---
id: editing
slug: /guides/editing
title: Editing
description: "Draw and modify geometry with editing sessions, transactions, and undo history."
api: ["AffineMatrix", "AppendedArc", "AutoCompletePolygonHandler", "AutoCompletePolygonOptions", "AutoCompletePolygonResult", "BulkFeatureDeleteCommand", "BulkFeatureDeleteCommandOptions", "composeMatrix", "CompositeCommand", "DatasetReplaceCommand", "DatasetReplaceCommandOptions", "EditCommand", "EditHistory", "EditHistoryOptions", "Emap", "FeatureAffineCommand", "FeatureAffineCommandOptions", "FeatureAppendCommand", "FeatureAppendCommandOptions", "FeatureCreateCommand", "FeatureDeleteCommand", "FeatureDeleteCommandOptions", "FeaturePropertyChangeCommand", "FeaturePropertyChangeCommandOptions", "FeatureTranslateCommand", "FeatureTranslateCommandOptions", "FieldAddCommand", "FieldAddCommandOptions", "FieldRemoveCommand", "FieldRemoveCommandOptions", "FieldRenameCommand", "FieldRenameCommandOptions", "HistoryStateSnapshot", "IDENTITY_MATRIX", "invertMatrix", "planSharedArcSplit", "planSharedNodeSplit", "rotateMatrix", "scaleMatrix", "SplitSharedArcsCommand", "SplitSharedArcsCommandOptions", "SplitSharedArcsRemap", "SplitSharedNodeCommand", "SplitSharedNodePlan", "TopologySource.fromBytes", "Transaction", "TranslatedPointFeature", "VertexDeleteCommand", "VertexInsertCommand", "VertexMoveCommand", "AddPartOptions", "AddRingOptions", "DeletePartOptions", "DeleteRingOptions", "FillRingOptions", "PartEditHandler", "PartEditOptions", "ReshapeFeatureHandler", "ReshapeFeatureOptions", "ReshapeSelectedOptions", "ReshapeSelectedResult", "RingEditHandler", "RingEditOptions", "DrawFeatureHandler", "VertexEditHandler", "SplitFeatureHandler", "TransformFeatureHandler"]
examples: ["attribute-editing","china-editing","draw-snap","feature-rotate","feature-scale","feature-translate","rebuild-topology","reshape-ring-part","snapshot","split-features","transaction","undo-redo","vertex-editing", "luma-vertex-editing"]
stability: stable
verifiedVersion: unreleased
---

# Edit geometry

Emap modifies vector geometry through interactive handlers, edit sessions (`map.editSession`), and reversible commands (`EditCommand`). Every committed edit increments data versions and records an entry in `EditHistory` so users can undo and redo changes reliably.

## 1. Prepare an editable target layer

Imported `TopologySource` layers can be edited immediately. If you need to start drawing in an empty workspace, call `await map.createLayer()` to create both the underlying data layer (with its geometry type and field schema) and default render layers. Calling `map.addLayer()` alone only adds a visual style specification, not a data layer that can store drawn features.

The default `editor` preset installs all built-in editing handlers. The example below enables polygon drawing with vertex and edge snapping on data layer `lots` in source `parcels`:

```ts
map.drawFeature.setOptions({
  source: 'parcels', sourceLayer: 'lots', type: 'polygon',
  snapThreshold: 12, snapToVertex: true, snapToEdge: true,
});
map.drawFeature.enable();
```

`snapThreshold` is specified in screen pixels. When switching to another tool in your UI, call `map.drawFeature.disable()` so multiple handlers do not compete for pointer gestures.

## 2. Choose an editing handler or session

<span id="more-editing-tools" />
<span id="selection-editing-sessions" />
<span id="editing-refresh-in-the-luma-example" />

| Editing task | Handler or API entry point |
| --- | --- |
| Draw new points, lines, or polygons | `map.drawFeature` |
| Move, insert, or delete vertices | `map.vertexEdit` |
| Split features or reshape boundaries along a sketch line | `map.splitFeature`, `map.reshapeFeature` |
| Auto-complete adjacent polygons or edit rings and multipart islands | `map.autoCompletePolygon`, `map.ringEdit`, `map.partEdit` |
| Translate, rotate, or scale selected features interactively or programmatically | `map.transformFeature`, `map.editSession` |

When translating or transforming selected polygons, Emap splits arcs shared with unselected neighbors by default (`splitSharedArcs: true`) so unselected features stay in place. Pass `splitSharedArcs: false` when you want adjacent boundaries to stretch together; see [Topology model](../concepts/topology.md). For custom drag tools, use `map.editSession` to manage preview updates, commit, and cancellation explicitly.

## 3. Group multiple operations in a transaction

<span id="one-shot-operations" />
<span id="make-several-operations-one-action" />

Use `map.beginTransaction()` to combine multiple data or attribute edits into a single undo step. If any intermediate operation fails, roll back the transaction so the workspace is never left in a partially mutated state:

```ts
const tx = map.beginTransaction();
try {
  const clipped = await map.ops.clipLayer({
    source: 'parcels', target: 'lots', mask: 'boundary',
  });
  if (!clipped.ok) {
    tx.rollback();
    console.error(clipped.error);
  } else {
    const committed = await tx.commit('Clip parcels');
    if (!committed.ok) console.error(committed.error);
  }
} catch (error) {
  if (tx.isOpen) tx.rollback();
  throw error;
}
```

Keep transactions focused and short-lived; an open transaction blocks competing mutations on the map. Always check `committed.ok` after awaiting `tx.commit()`.

## 4. Manage undo history and post-commit validation

<span id="undo-redo-and-shortcuts" />

- **Undo and redo**: Use `map.canUndo()`, `map.undo()`, `map.canRedo()`, and `map.redo()`, and clean up keyboard shortcuts (`map.bindHistoryShortcuts()`) on component unmount. See [Undo and redo](../recipes/undo-redo.md).
- **Command contract**: Never mutate arrays returned by `source.getDataset()` directly. Low-level `EditCommand` classes record an already-applied change for undo/redo; use handlers, `map.editSession`, `map.attributes`, or `map.ops` to perform mutations.
- **Validation events**: Registered validators emit `validationfailed` after a commit (`after-commit`) to report issues such as self-intersections. Validation is asynchronous and does not roll back the commit. Later edits may already exist when the report arrives, so confirm the target commit is still the latest history entry before offering undo.

## Runnable examples

- [Vertex editing](/mapseekai/emap/examples/vertex-editing/)
- [Undo and redo](/mapseekai/emap/examples/undo-redo/)
- [Transactions](/mapseekai/emap/examples/transaction/)

## Implementation sources

<span id="core-methods" />
<span id="common-handler-methods" />
<span id="draw-features" />
<span id="handler-options" />
<span id="drag-sessions" />
<span id="advanced-undoable-edits" />
<span id="command-contract" />
<span id="built-in-command-options" />
<span id="low-level-topology-commands" />
<span id="supporting-contracts" />
<span id="experimental-luma-vertex-editor" />
<span id="deep-zoom-in-the-experimental-luma-editor" />

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/edit/transaction.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/edit/transaction.ts)
- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
