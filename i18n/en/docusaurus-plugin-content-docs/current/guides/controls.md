---
id: controls
slug: /guides/controls
title: Controls
description: "Mount and configure navigation, layer, selection, and editing controls."
api: ["BasemapControl", "BasemapOptions", "BasemapStyle", "BoxSelectControl", "BoxSelectControlOptions", "Control", "ControlPosition", "DrawFeatureControl", "DrawFeatureControlOptions", "EditToolbar", "EditToolbarOptions", "Emap", "GetScaleMetricsOptions", "HistoryControl", "HistoryControlOptions", "LassoSelectControl", "LassoSelectControlOptions", "LayerChangeEvent", "LayerChangeReason", "LayerControl", "MapLibreBasemapService", "MapLibreIntegrationOptions", "MapLibreOverlayService", "MapLibreOverlayServiceBase", "MapLibreOverlayResourceService", "MapLibreOverlayStyleService", "MapLibreServiceChangeEvent", "MapLibreServiceChangeReason", "MapLibreServiceErrorEvent", "MapLibreServiceEventMap", "MapLibreServiceManager", "MapLibreServiceState", "MapOptions", "MeasureControl", "MeasureControlOptions", "MeasureHandler", "MeasurementMode", "MeasureOptions", "MeasureResult", "NavigationControl", "NavigationOptions", "ScaleCalculationMethod", "ScaleControl", "ScaleControlOptions", "ScaleControlStyle", "ScaleMetrics", "ScaleViewMetrics", "SimplifyControl", "SimplifyControlOptions", "StatusControl", "StatusOptions", "VertexEditControl", "VertexEditControlOptions"]
examples: ["lasso-select","china-editing","draw-snap","interaction-handlers","measurement","online-map-services","simplify-control","vertex-editing"]
stability: stable
verifiedVersion: unreleased
---

# Add map controls

UI controls expose map navigation, status readouts, and editing tools on top of the canvas. Even when a preset registers control factories, your application chooses which controls to mount and must import `@mapseekai/emap/style.css`.

## Mount and remove controls

<span id="more-controls-and-parameters" />

Pass a control instance and a corner position (`'top-left'`, `'top-right'`, `'bottom-left'`, or `'bottom-right'`) to `map.addControl()`:

```ts
import '@mapseekai/emap/style.css';
import { HistoryControl, NavigationControl, ScaleControl } from '@mapseekai/emap';

const navigation = new NavigationControl({ showHome: true });
await map.addControl(navigation, 'top-left');
await map.addControl(new HistoryControl(), 'top-right');
await map.addControl(new ScaleControl(), 'bottom-left');
```

Both `addControl()` and `removeControl()` are asynchronous and should be awaited. Call `await map.removeControl(navigation)` to remove a single control early; `await map.dispose()` automatically cleans up all controls still mounted on the map.

## Built-in controls by task

| Task | Control classes | Notes |
| --- | --- | --- |
| Zoom and reset to data extent | `NavigationControl` | Optional home button |
| Undo and redo edits | `HistoryControl` | Syncs with edit history state |
| Scale bar, cursor coordinates, and CRS readout | `ScaleControl`, `StatusControl` | Coordinate readout reflects the active CRS |
| Layer visibility and online basemaps | `LayerControl`, `BasemapControl` | `BasemapControl` requires the MapLibre plugin |
| Feature selection tools | `BoxSelectControl`, `LassoSelectControl` | Toggles box or lasso selection handlers |
| Geometry drawing, vertex editing, and simplification | `DrawFeatureControl`, `VertexEditControl`, `EditToolbar`, `SimplifyControl` | Requires an existing source and target data layer |
| Distance and area measurement | `MeasureControl` | Calculation depends on the active CRS and measurement mode |

See [Editing](./editing.md) for configuring target layers on drawing and editing controls.

## Mount via the control registry or write a custom control

In presets that register built-in control factories (`editor` and `viewer`), you can mount a control by name using `await map.controls.add('navigation')`. If you start from the `empty` preset, make sure the services required by that control are installed first.

To build a custom control, implement the `Control` interface exported by the root package. Its methods receive a bounded `ControlContext`, not the full `Emap` instance:

1. Create and return the root DOM element in `onAdd(map)`, and bind your DOM or map event listeners.
2. Unsubscribe all listeners and release DOM references in `onRemove(map)`.
3. Provide accessible button labels (`aria-label` or visible text), keyboard focus styles, and adequate hit target sizes rather than relying on icon shapes or color alone.

## Verify control layout and lifecycle

Check that mounted controls do not obscure critical map features, wrap cleanly on narrow viewports, and stop responding to map events after `removeControl()`. See [Status control](../recipes/status-control.md) for a focused example.

## Runnable examples

- [China editing](/mapseekai/emap/examples/china-editing/)
- [Vertex editing](/mapseekai/emap/examples/vertex-editing/)
- [Measurement](/mapseekai/emap/examples/measurement/)

## Implementation sources

<span id="core-methods" />
<span id="constructor-options" />
<span id="navigationcontrol" />
<span id="statuscontrol" />
<span id="scalecontrol" />
<span id="historycontrol" />
<span id="layercontrol" />
<span id="basemapcontrol" />
<span id="drawfeaturecontrol" />
<span id="vertexeditcontrol" />
<span id="edittoolbar" />
<span id="measurecontrol" />
<span id="boxselectcontrol" />
<span id="lassoselectcontrol" />
<span id="simplifycontrol" />

- [`src/ui/control.ts`](https://github.com/mapseekai/emap/blob/master/src/ui/control.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
