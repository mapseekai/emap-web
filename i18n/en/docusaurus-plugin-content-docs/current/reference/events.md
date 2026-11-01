---
id: events
slug: /reference/events
title: Events reference
description: "Look up map event names, payload fields, and feature-event filtering contracts."
api: ["Emap", "EmapEventMap", "CameraEvent", "LayerChangeEvent", "EventListener", "FeatureEvent", "FeatureEventFilter", "PointerMoveEvent"]
examples: ["feature-selection","web-worker"]
stability: stable
verifiedVersion: unreleased
---

# Events reference

<span id="feature-event-filters" />

`EmapEventMap` defines the strongly typed event names and payloads emitted by `map.on()` and `map.once()` (with the event `type` attached to each callback payload). Internal events on standalone `TopologySource`, handler, or Worker runtime objects are not automatically forwarded through `map.on()`.

## Camera and layout events

<span id="camera-payload" />

| Event name | Payload type | Notes |
| --- | --- | --- |
| `movestart`, `moveend`, `zoomstart`, `zoom`, `zoomend` | `CameraEvent` | Includes `center` (in project CRS coordinates), `zoom` (`log2(scale)`), and `originalEvent` (`null` for programmatic moves) |
| `move` | `Partial<CameraEvent>` | Emitted on each frame during movement; `center` or `zoom` may be omitted on intermediate notifications |
| `resize` | No extra fields | Container dimensions changed |
| `crschange` | No extra fields | Active project CRS changed; read the updated CRS from `map` |

Treat fields on `move` as optional, and remember that `CameraEvent.zoom` is `log2(scale)` rather than a WebMercator tile zoom level in arbitrary projections.

## Data, layer, selection, and history events

| Event name | Payload fields | Meaning |
| --- | --- | --- |
| `data` | `{ sourceId?, reason?, origin? }` | Workspace data changed (`reason`: `'edit'` \| `'load'` \| `'replace'` \| `'reproject'`; `origin` can be `'external'`) |
| `layerchange` | `{ reason, layerId?, layers }` | Render layer added, removed, reordered, or updated (`reason`: `'add'` \| `'remove'` \| `'visibility'` \| `'effective'` \| `'filter'`) |
| `editmodechange` | `{ mode }` | Active editing mode changed |
| `historychange` | `Partial<HistoryStateSnapshot>` | Edit history stack updated; snapshot fields are optional, so read `map.canUndo()` / `map.canRedo()` directly |
| `selectionchange` | `{ selected, added, removed }` | `FeatureRef[]` arrays for current selection and the delta from this update |

Note that a `data` event indicates an in-memory workspace change, not confirmation that an exported file was written to disk.

## Pointer and feature hit events

<span id="core-events" />
<span id="more-map-state-events" />
<span id="more-pointer-and-feature-events" />
<span id="pointer-and-feature-payload" />

| Event name | Trigger condition |
| --- | --- |
| `mousemove` | Pointer moves anywhere inside the map canvas (including empty space; hit fields on `PointerMoveEvent` may be empty) |
| `feature:click` | Pointer click hits a pickable feature |
| `feature:hover` | Moving pointer hits a pickable feature |
| `feature:enter` | Pointer enters a newly hit feature |
| `feature:leave` | Pointer leaves the previously hit feature |

- **`FeatureEvent` payload**: Contains `ref` (`{ source, layer, id }`), `point` (local canvas pixels as `{ x, y }`), `lngLat` (coordinates in the **active project CRS**, regardless of whether the CRS is geographic or projected), and `originalEvent`.
- **`FeatureEventFilter`**: When passing `{ source, layers }` as the second argument to `map.on('feature:click', filter, listener)`, `source` is a map source ID and `layers` is an array of **data-layer IDs** (not render-layer IDs).
- Prefer `feature:enter` and `feature:leave` for hover UI updates, and keep `mousemove` callbacks lightweight.

## Diagnostic and validation events

| Event name | Payload fields | Meaning |
| --- | --- | --- |
| `error` | `{ error, layerId?, filterExpression?, valueType? }` | Runtime or style/filter expression diagnostic |
| `warning` | `{ layerId, buckets?, error? }` | Non-fatal style resolution or classification bucket warning |
| `validationfailed` | `{ results, label }` | Post-commit (`after-commit`) validator report |

Diagnostic events do not replace `try/catch` or `OpResult.ok` checks. `validationfailed` fires **after** an edit has already been committed; it does not automatically roll back the commit.

## Worker job notifications (`workerjobstart` / `workerjobend`)

When Mapshaper operations run in a Worker, the map emits `workerjobstart` (`{ id, cmd, label, datasetVertexCount }`) and `workerjobend` (`{ id, ok, durationMs, errorMessage? }`) through the generic `map.on(type, listener)` overload.

Note that `workerjobend` with `ok: true` means the Worker round trip and dataset deserialization finished; the main thread still performs source version checks (`stale-operation`) before committing. Always check the operation's returned `OpResult` for final commit status.

## Subscription lifecycle

Pass the exact same function reference to `map.on()` and `map.off()`. `map.once()` automatically removes its listener after the first delivery, but if you may need to unsubscribe before the event fires, use `map.on()` and `map.off()` explicitly. See [Events guide](../guides/events.md).

## API

<span id="core-methods" />
<span id="state-payload" />

- [src.EmapEventMap](/mapseekai/emap/api/interfaces/emap.EmapEventMap.html)
- [src.EventListener](/mapseekai/emap/api/types/emap.EventListener.html)
- [src.FeatureEvent](/mapseekai/emap/api/interfaces/emap.FeatureEvent.html)

## Runnable examples

- [feature-selection](/mapseekai/emap/examples/feature-selection/)
- [web-worker](/mapseekai/emap/examples/web-worker/)

## Implementation sources

- [`src/engine/core/event-map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/event-map.ts)
- [`src/engine/core/feature-event-dispatcher.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/feature-event-dispatcher.ts)
- [`src/engine/core/pointer-event-dispatcher.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/pointer-event-dispatcher.ts)
