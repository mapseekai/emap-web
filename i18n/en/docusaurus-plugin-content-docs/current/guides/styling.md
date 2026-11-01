---
id: styling
slug: /guides/styling
title: Styling layers
description: "Configure vector paint properties, expressions, labels, and image symbols."
api: ["SymbolStyle", "SymbolLayout", "SymbolPaint", "SymbolImage", "SymbolLabeling", "SymbolIconSettings", "Emap.setLayerSymbol", "Emap.removeLayerSymbol", "Emap.setSymbolLayoutProperty", "Emap.setSymbolPaintProperty", "IconOptions", "Emap.setLayerIcon", "LabelOptions", "Emap.setLayerLabel", "ClassificationResult", "ClassifyFeaturesOptions", "Emap.setPaintProperty", "FillPaint", "LayerSpecification", "LineDashStyle", "LinePaint", "PointMarkerShape", "StyleExpression", "Emap", "CirclePaint"]
examples: ["getting-started/lines","getting-started/point-style","labels","point-icons","getting-started/polygon-fill","getting-started/polygons","attribute-styling"]
stability: stable
verifiedVersion: unreleased
---

# Style layers

<span id="image-symbols-on-existing-point-layers" />

Render layers (`LayerSpecification`) bind a data source to visual appearance without modifying underlying geometry. You can combine base paint properties, attribute-driven style expressions, and attached text/icon symbols on the same data layer.

## Add fill, line, and point layers

<span id="fill-paint" />
<span id="classified-fill-buckets" />

Multiple render layers can reference the same source and data layer (`source-layer`). For example, if source `parcels` contains a polygon data layer named `lots`, you can add separate `fill` and `line` render layers to control interior fill and boundary stroke independently:

```ts
map.addLayer({
  id: 'parcel-fill', type: 'fill', source: 'parcels', 'source-layer': 'lots',
  paint: { 'fill-color': '#47b878', 'fill-opacity': 0.35 },
});
map.addLayer({
  id: 'parcel-outline', type: 'line', source: 'parcels', 'source-layer': 'lots',
  paint: { 'line-color': '#195533', 'line-width': 2 },
});
```

- Use `type: 'circle'` for point layers. Both `line-width` and `circle-radius` are specified in screen pixels.
- Call `map.setPaintProperty(layerId, name, value)` to update a style property dynamically.
- Call `map.setLayerVisibility(layerId, 'none')` or `'visible'` to hide or show a render layer.

## Drive colors with attribute expressions

Pass a typed style expression to `setPaintProperty()` to color features based on their attributes. In a `match` expression, the final argument provides the fallback value when a feature's field is missing or does not match any listed case:

```ts
map.setPaintProperty('parcel-fill', 'fill-color', [
  'match', ['get', 'zone'],
  'residential', '#47b878', 'industrial', '#d99c31', '#9aa8a0',
]);
```

- Emap supports a strongly typed subset of style expressions (`StyleExpression`); arbitrary MapLibre expressions or inline JavaScript functions are not evaluated here.
- If you run `map.ops.classifyFeatures()` to write Mapshaper style fields into the dataset, set `styleSource: 'mapshaper'` on the render layer and verify `result.ok` before relying on the generated classes.

### Supported style expression operators cheat sheet

| Operator | Syntax signature | Purpose and example |
| --- | --- | --- |
| `get` | `['get', 'fieldName']` | Retrieve feature attribute value: `['get', 'population']` |
| `match` | `['match', input, k1, v1, k2, v2, ..., fallback]` | Multi-branch equality match: `['match', ['get', 'type'], 'park', '#4caf50', '#ccc']` |
| `step` | `['step', input, default, stop1, value1, ...]` | Numeric thresholds: `['step', ['get', 'population'], '#ccc', 100, '#4caf50']` |
| `interpolate` | `['interpolate', 'linear', input, stop1, value1, stop2, value2, ...]` | Linear numeric or color interpolation with ascending stops |
| `==` / `!=` | `['==', a, b]` / `['!=', a, b]` | Equality comparison: `['==', ['get', 'status'], 'active']` |
| `<`, `<=`, `>`, `>=` | `['<', a, b]` / `['>=', a, b]` | Numeric inequalities: `['>=', ['get', 'speed'], 60]` |
| `!` / `all` / `any` | `['!', condition]` / `['all', condition1, ...]` / `['any', condition1, ...]` | Combine Boolean conditions |

## Configure labels, icons, and attached symbols

<span id="attached-feature-labels" />

- **Lightweight text or icons**: Set `label` (`setLayerLabel()`) for text annotations, or `icon` (`setLayerIcon()`) on point layers with a valid image URL. Passing `null` to `setLayerLabel(id, null)` removes the label without removing the layer.
- **Combined text and image symbols (`symbol`)**: Attach a `symbol` configuration to combine icon images and text labels with collision detection, anchor positioning, and halo styling. The example below assumes a registered point source `poi` with a `name` attribute and a reachable `/images/marker.png` asset:

```ts
map.addLayer({
  id: 'poi', type: 'circle', source: 'poi',
  paint: { 'circle-radius': 4, 'circle-color': '#237a49' },
  symbol: {
    images: { marker: { url: '/images/marker.png', size: [24, 32] } },
    layout: {
      'icon-image': 'marker', 'icon-size': 1, 'icon-anchor': 'bottom',
      'text-field': ['get', 'name'], 'text-size': 14,
      'text-offset': [0, 1.2], 'text-allow-overlap': false,
    },
    paint: {
      'icon-opacity': 1, 'text-color': '#243447',
      'text-halo-color': '#ffffff', 'text-halo-width': 1.5,
    },
  },
});
map.setSymbolLayoutProperty('poi', 'text-size', 20);
map.setSymbolPaintProperty('poi', 'icon-opacity', 0.6);
map.setSymbolLayoutProperty('poi', 'text-offset', null);
map.removeLayerSymbol('poi');
```

Attached symbols inherit the parent render layer's display filter and drawing order. Calling `map.removeLayerSymbol('poi')` removes only the symbol attachment while keeping the `'poi'` circle layer intact.

## Check rendering consistency across backends

`canvas2d`, `webgl2`, and `webgpu` share the same layer specification API, but texture loading, MSDF font rendering, and display LOD pipelines differ internally. When diagnosing a visual discrepancy, keep the dataset and camera fixed and test base paint, labels, and symbols one by one. See [Performance](../recipes/performance.md) for display LOD settings.

## Runnable examples

- [Polygon fill](/mapseekai/emap/examples/getting-started/polygon-fill/)
- [Line styling](/mapseekai/emap/examples/getting-started/lines/)
- [Attribute styling](/mapseekai/emap/examples/attribute-styling/)

## Implementation sources

<span id="core-parameters" />
<span id="more-paint-properties" />
<span id="line-paint" />
<span id="circle-paint" />
<span id="more-layer-operations" />
<span id="attribute-driven-styles" />
<span id="expression-forms" />
<span id="unified-attached-symbol-settings" />

- [`src/engine/map/label.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/label.ts)
- [`src/engine/map/style-expression.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/style-expression.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
