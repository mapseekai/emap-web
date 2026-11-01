---
id: status-control
slug: /recipes/status-control
title: Status control
description: "Mount a status control and configure coordinate display, precision, and position."
api: ["Emap", "StatusControl", "StatusOptions"]
examples: ["duckdb-geoparquet-query", "duckdb-query", "web-worker"]
stability: stable
verifiedVersion: unreleased
---

# Display coordinate status

`StatusControl` renders a compact status bar at the edge of the map showing the pointer's current coordinates and the active project CRS code. It is a read-only display control and does not alter or reproject map data.

## Mount the status bar

Import `@mapseekai/emap/style.css` and mount `StatusControl` onto a ready `map` instance:

```ts
import { StatusControl } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

const status = new StatusControl({
  showMousePos: true,
  showEPSG: true,
  alignment: 'right',
});
await map.addControl(status, 'bottom-left');
```

- `alignment` controls text alignment inside the status bar widget (`'left'` or `'right'`).
- The second argument to `map.addControl(status, 'bottom-left')` chooses which corner of the map container holds the control.

## Understand displayed coordinates and precision

- **Active CRS units**: Displayed coordinates always use the map's current project CRS. In `EPSG:4326` they represent longitude and latitude in degrees; in `EPSG:3857` or a local projected CRS they represent meters or planar units.
- **CRS badge**: The EPSG readout reflects the active CRS identifier. If a custom WKT/Proj definition does not map to a standard EPSG code, the dataset still has a valid CRS even when no numeric EPSG badge is shown.
- **Formatting**: `StatusControl` formats coordinates to four decimal places. If you need custom degree-minute-second formatting or dynamic precision, subscribe to `mousemove` and `crschange` events (see [Events](../guides/events.md)) to render your own readout.

## Remove and verify

Call `await map.removeControl(status)` to unmount the status bar independently, or let `await map.dispose()` clean up all mounted controls automatically. Verify that coordinates update smoothly while moving across the canvas, clear or hold cleanly when the pointer leaves, and update immediately after a CRS change.

## API

<span id="core-parameters" />
<span id="control-options" />
<span id="more-mounting-options" />

- `Emap`
- `StatusControl`
- `StatusOptions`

## Runnable examples

- [DuckDB GeoParquet query](/mapseekai/emap/examples/duckdb-geoparquet-query/)
- [DuckDB query](/mapseekai/emap/examples/duckdb-query/)
- [Web Worker](/mapseekai/emap/examples/web-worker/)

## Implementation sources

- [`src/ui/status-control.ts`](https://github.com/mapseekai/emap/blob/master/src/ui/status-control.ts)
