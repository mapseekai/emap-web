---
id: camera
slug: /guides/camera
title: Camera
description: "Set map center, zoom, and extent, and inspect camera state and events."
api: ["Emap", "Bounds", "Viewport", "CameraOptions", "AnimationOptions", "FlyToOptions", "FitBoundsOptions"]
examples: ["getting-started/vector-file","crs-switch"]
stability: stable
verifiedVersion: unreleased
---

# Control the camera

<span id="reading-the-view-and-events" />

Control the visible area of the map by setting its center, scale, or bounding box (`Bounds`). All snippets on this page assume an initialized `map` instance, and bounds examples assume a registered `source` whose coordinates match the active project CRS.

## Choose a positioning method

Select the camera method that matches your interaction scenario:

- **`jumpTo()`**: Updates the viewport immediately without animation. Ideal for initial page load or restoring saved view state.
- **`easeTo()` / `flyTo()`**: Smoothly animates the camera to a new position, suitable for user-triggered navigation.
- **`fitBounds()`**: Computes the center and scale needed to fit a `Bounds` rectangle inside the current container dimensions with optional pixel padding.

Always check `bounds.hasBounds()` before fitting so empty layers do not move the camera to an invalid position:

```ts
const bounds = source.getExtent();
if (bounds.hasBounds()) {
  map.fitBounds(bounds, { padding: 32, duration: 0 });
}
```

For single-point layers, zero-width extents, or fitting across multiple sources at once, see [Fit data bounds](../recipes/fit-bounds.md).

## Coordinate spaces, scale, and zoom

Keep these coordinate and scale rules in mind when reading or restoring camera state:

1. **`center` uses project CRS coordinates**: When calling `jumpTo` or `easeTo`, `center` must be expressed in the map's active CRS. Do not pass `[lng, lat]` degrees into a map using `EPSG:3857` meters.
2. **`scale` takes precedence over `zoom`**: `scale` must be a positive number and overrides `zoom` if both are passed in the same call. Camera events report `zoom` as `log2(scale)`, which differs from WebMercator tile zoom levels.
3. **Saving and restoring view state**: In WebMercator (`EPSG:3857`), `map.getCenter()` converts the center to `[lng, lat]` for convenience, so its return value cannot be passed directly back into `jumpTo({ center })` as projected meters. In a `moveend` callback, save the event's project-coordinate `center` and use `Math.abs(map.getTransform().mx)` as `scale`. The event payload itself has no `scale` field. If the map CRS changes, transform the center before restoring.

## Control animations and pixel offsets

Animation `duration` is specified in milliseconds, and `animate: false` disables transitions. Use `panBy([dx, dy])` to shift the viewport by screen pixels (for example, to make room for a Newly opened sidebar), and call `stop()` to cancel an in-flight animation:

```ts
map.panBy([80, 0], { duration: 250 });
map.stop();
```

If your page layout resizes the map container, wait for the container dimensions to settle before calling `fitBounds()`.

## Handle container resize (`map.resize`)

When collapsible sidebars, full-screen toggles, or split-pane drag handles change the container's CSS dimensions, the Canvas drawing buffer needs to update its dimensions.

Call `map.resize()` to recalculate viewport metrics and repaint without distorting geometry:

```ts
const resizeObserver = new ResizeObserver(() => {
  map.resize();
});
resizeObserver.observe(document.getElementById('map')!);
```

Disconnect the observer on component unmount to prevent leaks.

## Listen for camera events

- Subscribe to **`move`** when you need to update lightweight canvas overlays on every frame.
- Subscribe to **`moveend`** when persisting viewport state to the URL or triggering spatial queries after navigation settles.
- Call `map.getExtent()` to read the current viewport bounding box, or `source.getExtent()` to read the data bounding box. See [Events reference](../reference/events.md) for payload details.

## Runnable examples

- [Open a vector file](/mapseekai/emap/examples/getting-started/vector-file/)
- [CRS switch](/mapseekai/emap/examples/crs-switch/)

## Implementation sources

<span id="core-methods" />
<span id="cameraoptions" />
<span id="animationoptions" />
<span id="fitboundsoptions" />
<span id="more-view-operations" />
<span id="extent-management" />

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/geo/camera.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/geo/camera.ts)
