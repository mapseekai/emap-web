---
id: selection
slug: /guides/selection
title: Selection
description: "Manage selection with feature references or gestures and observe selection changes."
api: ["BoxSelectHandler", "BoxSelectHandlerOptions", "BoxSelectStyle", "ClickSelectHandler", "DragPanHandler", "DragPanOptions", "DrawFeatureHandler", "DrawFeatureOptions", "DrawGeometryType", "Emap", "featureMatchesLasso", "LassoSelectHandler", "LassoSelectHandlerOptions", "LassoSelectStyle", "MergeSelectedOptions", "ModifierCombo", "pointInPolygon", "resolveMode", "ScrollZoomHandler", "ScrollZoomOptions", "SelectHandlerOptions", "Selection", "SelectionDiff", "SelectionSnapshot", "SelectMode", "TransformFeatureHandler", "TransformFeatureOptions", "VertexEditHandler", "VertexEditOptions", "FeatureQuery"]
examples: ["lasso-select","feature-rotate","feature-scale","feature-selection","feature-translate","merge-selected"]
stability: stable
verifiedVersion: unreleased
---

# Select and query features

<span id="mutate-and-read" />

Emap's selection service tracks selected features (`FeatureRef`) for attribute inspection, interactive transforms, and batch operations. You can also manage temporary hover highlights separately through `map.highlight` so pointer feedback does not overwrite the user's active selection.

## Select programmatically with `FeatureRef`

<span id="feature-references" />

A `FeatureRef` identifies a feature by `{ source, layer, id }`, where `source` is the map source ID, `layer` is the **data-layer ID** (not a render-layer ID), and `id` is the zero-based feature index in that data layer:

```ts
const refs = [{ source: 'parcels', layer: 'lots', id: 42 }];
map.select(refs, { mode: 'add' });
const selected = map.getSelection();
map.deselect(refs);
map.clearSelection();
```

Because `id` is a positional index within the dataset, deleting, merging, or replacing features can change indexes. Store persistent business keys in feature attributes and re-query when you need long-lived identity across dataset replacements.

## Enable click selection

<span id="more-selection-gestures" />
<span id="click-selection" />
<span id="listen-for-selection-changes" />

Configure and enable `map.clickSelect` to let users select features directly on the canvas:

```ts
map.clickSelect.setOptions({
  layers: ['lots'],
  modifiers: { replace: 'none', add: 'shift', toggle: 'shift+alt' },
});
map.clickSelect.enable();
```

With the settings above, a plain click replaces the selection, `Shift + Click` adds to it, and `Shift + Alt + Click` toggles the clicked feature. Note that if multiple sources contain data layers with the same name, check `ref.source` in your event listener to disambiguate them.

## Enable box and lasso selection

<span id="box-selection" />
<span id="lasso-selection" />

`map.boxSelect` selects features within a dragged screen rectangle, while `map.lassoSelect` selects features within a freehand polygon. When switching active selection tools in a toolbar, disable competing gesture handlers first:

```ts
map.boxSelect.disable();
map.lassoSelect.setOptions({ layers: ['lots'], includeIntersecting: true });
map.lassoSelect.enable();
```

- **`includeIntersecting: true`**: Selects any feature whose geometry intersects the box or lasso, rather than requiring the entire feature to be contained inside the region.
- **`dragActivator` and `modifiers`**: Customize which mouse button or modifier keys trigger selection versus map panning (`dragPan`).

## Listen for selection changes and understand display filters

Subscribe to `selectionchange` to synchronize attribute tables or action buttons:

```ts
map.on('selectionchange', ({ selected, added, removed }) => {
  console.log(selected.length, added.length, removed.length);
});
```

- `selected` contains the full current selection, while `added` and `removed` report the delta from this change.
- To read feature geometry or attributes without changing selection state, use `map.features` or `map.queryFeatures()`.
- **Display filters vs. data subsets**: Setting a `filter` on a render layer hides non-matching features from rendering and pointer picking, but it does **not** delete records from the source or automatically restrict data exports or `map.ops` calls. See [Attributes](../data/attributes.md) for filtering data layers.

## Runnable examples

- [Feature selection](/mapseekai/emap/examples/feature-selection/)
- [Box selection](/mapseekai/emap/examples/lasso-select/)
- [Lasso selection](/mapseekai/emap/examples/lasso-select/)

## Implementation sources

<span id="core-methods" />

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/engine/core/handlers/click-select.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/handlers/click-select.ts)
- [`src/engine/core/handlers/lasso-select.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/handlers/lasso-select.ts)
