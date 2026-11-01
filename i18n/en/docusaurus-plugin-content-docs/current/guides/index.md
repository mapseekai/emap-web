---
id: index
slug: /guides/
title: How-to guides
description: "Task-oriented guides for map display, editing, data, and integration."
api: []
examples: []
stability: stable
verifiedVersion: unreleased
---

# How-to guides

These task-oriented guides show how to integrate specific features when you already have a working `Emap` instance. If you are new to Emap and want to understand how sources, data layers, and render layers work together from scratch, start with [Your first map](../getting-started/quick-start.md).

## Display and interaction

<span id="interaction-and-editing" />
<span id="integration-and-performance" />

| Task | Guide | Prerequisites |
| --- | --- | --- |
| Pan, zoom, and fit the viewport to bounds | [Camera](./camera.md) | Mounted container and active project CRS |
| Configure fill, line, circle, classified colors, labels, and icons | [Styling layers](./styling.md) | Registered source and known attribute fields |
| Select features by click, box, or lasso | [Selection](./selection.md) | Pickable data layers |
| Synchronize UI panels with map state changes | [Events](./events.md) | Component teardown cleanup for listeners |
| Mount navigation, history, measurement, and editing toolbars | [Controls](./controls.md) | `@mapseekai/emap/style.css` imported |

## Data processing and editing

<span id="data-processing" />

| Task | Guide | Prerequisites |
| --- | --- | --- |
| Draw features, edit vertices, and group changes in transactions | [Editing](./editing.md) | Target data layer and `editor` preset |
| Read/write attributes, manage fields, and apply display filters | [Attributes](../data/attributes.md) | Feature references (`FeatureRef`) and field schema |
| Run undoable spatial operations (buffer, clip, simplify, union) | [Data operations](../data/operations.md) | Target layer, distance units, and `OpResult` handling |
| Import user-selected files with byte and ZIP limits | [File import](../recipes/file-upload.md) | Resource limits and CRS preflight handling |
| Bind undo/redo buttons and keyboard shortcuts | [Undo and redo](../recipes/undo-redo.md) | Component lifecycle management |

## Runtime extension, Workers, and diagnostics

- **Extend capabilities**: Read [Plugins](./plugins.md) to register custom Cordis services, format codecs, or AI tool capabilities.
- **Offload heavy computation**: Read [Web Workers](./worker.md) to route Mapshaper operations, GPU geometry preparation, and raster decoding to background threads.
- **Tune performance and handle errors**: Use [Performance](../recipes/performance.md) to isolate CPU/GPU bottlenecks and configure LOD, and use [Error handling](../recipes/error-handling.md) to recover from failed operations or roll back transactions.

For complete method signatures and parameter types, consult the [API reference](/mapseekai/emap/api/). To understand the design behind shared topology and coordinate spaces, read [Concepts](../concepts/overview.md).

## Implementation sources

<span id="map-display" />

- [`src/index.ts`](https://github.com/mapseekai/emap/blob/master/src/index.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
