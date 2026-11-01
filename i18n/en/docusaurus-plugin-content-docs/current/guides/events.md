---
id: events
slug: /guides/events
title: Events
description: "Subscribe to map and feature events and manage filters and listener lifecycles."
api: ["CameraEvent", "Emap", "EmapEventMap", "EventDispatcher", "EventListener", "FeatureEvent", "FeatureEventFilter"]
examples: ["feature-attributes","interaction-handlers"]
stability: stable
verifiedVersion: unreleased
---

# Subscribe to map events

<span id="other-emitted-map-events" />
<span id="high-frequency-events" />

Use map events to keep external UI panels synchronized with viewport movement, feature selection, and editing state. Use `map.on()` for recurring updates, `map.once()` for a single delivery, and always remove listeners when your UI component unmounts.

## Subscribe and unsubscribe cleanly

<span id="lifecycle-data-and-layers" />
<span id="editing-diagnostics-and-selection" />
<span id="pointer-and-feature" />

Pass the exact same function reference to `map.off()` that you passed to `map.on()`:

```ts
const onMoveEnd = () => {
  console.log(map.getCenter(), map.getTransform().mx);
};
map.on('moveend', onMoveEnd);

// Run during component teardown:
map.off('moveend', onMoveEnd);
```

If a one-time listener might need to be cancelled before it ever fires, register it with `map.on()` and remove it with `map.off()` rather than relying on `map.once()` with the original callback reference.

## Choose the right event for your task

<span id="feature-event-filters" />
<span id="event-payloads" />

| Category | Event names | Typical use |
| --- | --- | --- |
| Data and CRS changes | `data`, `crschange`, `layerchange` | Refresh layer trees, attribute tables, or CRS badges |
| Camera movement | `move`, `moveend`, `zoom` | Update canvas overlays (`move`) or persist viewport state (`moveend`) |
| Selection state | `selectionchange` | Sync inspector panels and toolbar button states |
| Editing and history | `editmodechange`, `historychange` | Update active tool indicators and Undo/Redo buttons |
| Pointer and feature hits | `mousemove`, `feature:click`, `feature:hover`, `feature:enter`, `feature:leave` | Pick features on click or show hover tooltips |
| Diagnostics and Workers | `error`, `warning`, `validationfailed`, `workerjobstart`, `workerjobend` | Log runtime diagnostics and display background job spinners |

See [Events reference](../reference/events.md) for the exact payload structure of each event. Note that a `data` event indicates a workspace data change, not confirmation that an external file export finished.

## Filter feature events by source and data layer

When listening to `feature:click`, `feature:hover`, `feature:enter`, or `feature:leave`, you can pass a `FeatureEventFilter` as the second argument. The `layers` array filters by **data-layer IDs** inside the source, not render-layer IDs:

```ts
map.on('feature:click', { source: 'parcels', layers: ['lots'] }, (event) => {
  map.select([event.ref]);
});
```

- Every `FeatureEvent` carries `ref` (`{ source, layer, id }`), canvas pixel coordinates (`point`), data coordinates (`lngLat`, expressed in the active project CRS), and `originalEvent`.
- `mousemove` fires across the entire canvas (including empty space), whereas `feature:hover` fires only when the pointer hits a feature. Prefer `feature:enter` and `feature:leave` for hover state transitions so you do not rebuild UI components on every pixel of pointer movement.

## Combine diagnostic events with explicit error checking

Diagnostic events such as `error`, `validationfailed`, and `workerjobend` are useful for global status bars and logging, but they do not replace `try/catch` blocks or `OpResult.ok` checks at your call site. Always check the return value of `map.ops.*` or `transaction.commit()` to confirm whether a data change was committed.

## Runnable examples

- [Feature attributes](/mapseekai/emap/examples/feature-attributes/)
- [Interaction handlers](/mapseekai/emap/examples/interaction-handlers/)

## Implementation sources

<span id="core-methods" />
<span id="more-subscription-options" />
<span id="camera" />

- [`src/engine/core/events.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/events.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
