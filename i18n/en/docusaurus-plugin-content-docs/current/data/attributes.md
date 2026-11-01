---
id: attributes
slug: /data/attributes
title: Attributes
description: "Read attribute records, filter features, and modify fields through undoable operations."
api: ["Emap", "Feature", "ApplyExpressionOptions", "JoinTableOptions", "CreateLayerOptions", "LayerFieldDefinition"]
examples: ["create-layer","attribute-editing","attribute-expressions","feature-attributes","join"]
stability: stable
verifiedVersion: unreleased
---

# Read and edit attributes

<span id="query-and-feature-parameters" />
<span id="expressions-filtering-and-joins" />

Feature attribute records align with geometry by feature index (`id`) within a data layer. Always read attributes through `map.features` and write updates through `map.attributes` or `map.ops` so data versions, attribute-driven styles, and undo history stay synchronized.

## Read feature properties

<span id="change-feature-properties" />

Pass a `FeatureRef` (`{ source, layer, id }`) to `map.features.get()` to inspect a feature's attributes:

```ts
const feature = map.features.get({ source: 'main', layer: 'districts', id: 3 });
console.log(feature?.properties);
```

`feature.properties` is a shallow-frozen snapshot. Do not mutate it or nested values: nested objects can still share references with the source record, and direct changes bypass redraws and history. Handle `null` when the source, layer, or feature index cannot be resolved.

## Update properties with undo support

Use `map.attributes.setFeatureProperties()` to patch one or more fields on a feature and record an undoable edit step:

```ts
const result = map.attributes.setFeatureProperties(
  { source: 'main', layer: 'districts', id: 3 },
  { name: 'Central district', population: 120000 },
);
if (!result.ok) console.error(result.error);
```

- Fields omitted from the patch object keep their existing values; passing `undefined` for a field removes that key from the record.
- `setFeatureProperties()` does not validate values against the layer's field definitions. Validate them in the application before calling it, and check `result.ok`.

## Declare field schemas on new layers

<span id="manage-fields" />
<span id="create-an-empty-layer-with-fields" />

When creating a new editable layer with `await map.createLayer()`, you can declare its field schema (`string`, `number`, or `boolean`) and default values up front so newly drawn features automatically receive that structure:

```ts
const source = await map.createLayer('survey', {
  name: 'survey-points',
  geometryType: 'point',
  crs: 'EPSG:4326',
  fields: [
    { name: 'name', type: 'string', defaultValue: '' },
    { name: 'height', type: 'number' },
    { name: 'checked', type: 'boolean', defaultValue: false },
  ],
});
console.log(source.getLayers()[0].data?.getFields?.());
console.log(source.getLayers()[0].fields);

map.drawFeature.setOptions({ source: 'survey', sourceLayer: 'survey-points', type: 'point' });
map.drawFeature.enable();
```

To add, rename, or remove columns on an existing layer, call `map.attributes.addField()`, `renameField()`, or `removeField()` and inspect the returned `OpResult`.

## Display filters vs. data operations

<span id="layer-display-filtering" />

Be careful to distinguish visual filtering from dataset mutation:

- **Render-layer display filter (`filter`)**: Controls which features are drawn and pickable on a specific render layer (`iterFiltered()` iterates by render-layer ID). It does **not** remove records from the data layer or filter `source.export()`.
- **Dataset operations (`map.ops`)**: Methods such as `filterFeatures`, `filterFields`, `sortFeatures`, `classifyFeatures`, and `joinTable` modify or derive data on the target data layer (`target` uses the data-layer ID).

## Expression evaluation policy (`expressionPolicy`)

<span id="expression-and-field-filter-parameters" />

For security, JavaScript-based Mapshaper expressions (such as `map.ops.applyExpression()`) are disabled by default and return `expression-disabled`. Enable `expressionPolicy: 'trusted'` in `Emap.create()` only when evaluating expressions authored by trusted application code; never pass unsanitized end-user input into `trusted` mode.

For standard UI form edits, use typed methods on `map.attributes`. For visual styling rules, use declarative style expressions (see [Styling layers](../guides/styling.md)).

## API

<span id="core-methods" />
<span id="more-property-reading" />
<span id="datatable-methods" />
<span id="more-property-operations" />
<span id="filter-parameters" />
<span id="property-write-parameters" />
<span id="create-layer-parameters" />
<span id="field-operation-parameters" />
<span id="field-name-validation" />
<span id="classification-parameters" />
<span id="join-parameters" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [Feature](/mapseekai/emap/api/interfaces/emap.Feature.html)
- [ApplyExpressionOptions](/mapseekai/emap/api/interfaces/emap.ApplyExpressionOptions.html)
- [JoinTableOptions](/mapseekai/emap/api/interfaces/emap.JoinTableOptions.html)

## Runnable examples

- [Feature attributes](/mapseekai/emap/examples/feature-attributes/)
- [Attribute editing](/mapseekai/emap/examples/attribute-editing/)
- [Create a layer](/mapseekai/emap/examples/create-layer/)
- [Attribute expressions](/mapseekai/emap/examples/attribute-expressions/)
- [Table join](/mapseekai/emap/examples/join/)

## Implementation sources

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/source/create-layer.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/create-layer.ts)
- [`src/engine/map/op-result.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/op-result.ts)
